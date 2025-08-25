import Door from "./types/Door";
import Flat from "./types/Flat";
import Furniture from "./types/Furniture";
import Plan from "./types/Plan";
import planErrors, { PlanError } from "./types/PlanError";
import Template from "./types/Template";
import Vec from "./types/Vec";
import { getAxesFromWall, getAxesFromWallString } from "./types/Wall";
import Window from "./types/Window";
import Util from "./util";
import parseElement from "./xml_to_js";
import * as xmllint from 'xmllint-wasm/index-browser';
import polylabel from "polylabel";

type PlanContext = {
	plan: Plan;
	svg: SVGSVGElement;
	axes: {
		x: Map<string, number>,
		y: Map<string, number>;
	};
	limits: {
		minX: number,
		minY: number,
		maxX: number,
		maxY: number;
	};
	options: PlannerOptions;
	templates: {
		[key: string]: {
			element: SVGSymbolElement,
			data: Template;
		};
	};
	viewPadding: number;
	style: string;
	errors: PlanError[];
};

export type PlannerOptions = {
	input: string;
	viewFlatId?: string;
	debug: {
		showAxes: boolean,
		axesButtons: boolean
	};
	showErrorLevels: ("note" | "warn" | "error")[];
	xsd?: string;
};

export async function render(options: PlannerOptions) {
	const ctx: PlanContext = {
		plan: new Plan(),
		svg: Util.create({
			name: "svg"
		}),
		axes: {
			x: new Map<string, number>(),
			y: new Map<string, number>()
		},
		limits: {
			minX: 0,
			minY: 0,
			maxX: 0,
			maxY: 0
		},
		options,
		templates: {},
		viewPadding: 500,
		style: "",
		errors: []
	};

	try {
		const doc = new DOMParser().parseFromString(options.input, "application/xml");
		ctx.plan = parseElement(doc.documentElement);
	} catch {
		ctx.errors.push(planErrors.cant_parse_xml_input());
	}

	const validationResult = await xmllint.validateXML({
		xml: options.input,
		schema: options.xsd ?? ""
	});

	if (!validationResult.valid) {
		for (let error of validationResult.errors) {
			ctx.errors.push(planErrors.xsd_error(error.loc?.lineNumber || 1, error.message));
		}
	}

	await initDefs(ctx);
	initAxes(ctx);

	if (!ctx.plan.flat || ctx.plan.flat.length == 0) {
		ctx.errors.push(planErrors.no_flats());
		return ctx;
	}

	for (const flat of ctx.plan.flat) {
		createFlat(ctx, flat);
	}

	if (options.debug.showAxes) {
		drawAxes(ctx);
	}

	ctx.svg.setAttribute("viewBox", `${ctx.limits.minX - ctx.viewPadding} ${ctx.limits.minY - ctx.viewPadding} ${ctx.limits.maxX - ctx.limits.minX + ctx.viewPadding * 2} ${ctx.limits.maxY - ctx.limits.minY + ctx.viewPadding * 2}`);
	ctx.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

	Util.create({
		name: "style",
		parent: ctx.svg,
		innerHTML: ctx.style
	});

	return ctx;
}

function getFlatPosition(ctx: PlanContext, flat: Flat) {
	let minX = 1000000;
	let minY = 1000000;
	let maxX = 0;
	let maxY = 0;

	if (flat.room.length == 0) {
		return { minX, minY, maxX, maxY };
	}

	for (const room of flat.room) {
		for (const wall of room.walls[0].wall) {
			const wallAxes = getAxesFromWall(wall);
			let x = ctx.axes.x.get(wallAxes.from1) ?? ctx.axes.x.get(wallAxes.from2) ?? null;
			let y = ctx.axes.y.get(wallAxes.from1) ?? ctx.axes.y.get(wallAxes.from2) ?? null;

			if (x != null && y != null) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}

			x = ctx.axes.x.get(wallAxes.to1) ?? ctx.axes.x.get(wallAxes.to2) ?? null;
			y = ctx.axes.y.get(wallAxes.to1) ?? ctx.axes.y.get(wallAxes.to2) ?? null;

			if (x != null && y != null) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
		}
	}

	return { minX, minY, maxX, maxY };
}

function createFlat(ctx: PlanContext, flat: Flat) {
	let canCreateFlat = true;

	if (ctx.options.viewFlatId) {
		if (ctx.options.viewFlatId == flat.id) {
			ctx.limits = getFlatPosition(ctx, flat);
		} else {
			canCreateFlat = false;
		}
	}

	if (canCreateFlat) {
		if (!flat.room || flat.room.length == 0) {
			ctx.errors.push(planErrors.flat_no_rooms(flat.id));
			return;
		}

		const g = Util.create({
			name: "g",
			classes: ["flat"],
			parent: ctx.svg,
			id: `flat-${flat.id}`
		});

		for (const i of flat.room.keys()) {
			createRoom(ctx, flat, i, g);
		}
	}
}

function getWallPoints(c1: Vec, c2: Vec, thickness: number) {
	const t = thickness / 2;

	const v = new Vec(c2.x - c1.x, c2.y - c1.y);
	const n = new Vec(v.y, -v.x).normalized();

	return {
		p1Inner: new Vec(c1.x + n.x * -t, c1.y + n.y * -t),
		p1Outer: new Vec(c1.x + n.x * t, c1.y + n.y * t),
		p2Inner: new Vec(c2.x + n.x * -t, c2.y + n.y * -t),
		p2Outer: new Vec(c2.x + n.x * t, c2.y + n.y * t)
	};
}

function createRoom(ctx: PlanContext, flat: Flat, roomNumber: number, flatGroup: SVGGElement) {
	const room = flat.room[roomNumber];
	if (!room.walls || !room.walls[0]) {
		ctx.errors.push(planErrors.room_not_enough_walls(flat.id, roomNumber, 0));
		return;
	}

	if (room.walls[0].wall.length < 2) {
		ctx.errors.push(planErrors.room_not_enough_walls(flat.id, roomNumber, room.walls.length));
	}

	const g = Util.create({
		name: "g",
		classes: ["room"],
		parent: flatGroup
	});

	const wallPoints: Vec[] = [];
	const innerPoints: Vec[] = [];
	const doors: SVGUseElement[] = [];
	const windows: SVGUseElement[] = [];
	const furnitures: SVGUseElement[] = [];

	for (const wall of room.walls[0].wall) {
		const wallAxes = getAxesFromWall(wall);
		let x = ctx.axes.x.get(wallAxes.from1) ?? ctx.axes.x.get(wallAxes.from2) ?? null;
		let y = ctx.axes.y.get(wallAxes.from1) ?? ctx.axes.y.get(wallAxes.from2) ?? null;
		if (x != null && y != null) {
			wallPoints.push(new Vec(x, y));
		}

		x = ctx.axes.x.get(wallAxes.to1) ?? ctx.axes.x.get(wallAxes.to2) ?? null;
		y = ctx.axes.y.get(wallAxes.to1) ?? ctx.axes.y.get(wallAxes.to2) ?? null;
		if (x != null && y != null) {
			wallPoints.push(new Vec(x, y));
		}
	}

	const wallCount = room.walls[0].wall.length ?? 0;

	if (wallPoints.length != wallCount) {
		ctx.errors.push(planErrors.room_walls_incorrect(flat.id, roomNumber));
	}

	// floor
	Util.create({
		name: "path",
		attributes: { "d": Util.polyline(wallPoints) },
		classes: ["floor"],
		parent: g
	});

	// walls
	let wallPath = "";
	let cutoutPath = "";

	for (let i = 0; i < wallCount; i++) {
		const walls = {
			prev: room.walls[0].wall[(i + wallCount - 1) % wallCount],
			curr: room.walls[0].wall[i],
			next: room.walls[0].wall[(i + 1) % wallCount]
		};

		const points = {
			prev: getWallPoints(Util.getWrapped(wallPoints, i - 1), Util.getWrapped(wallPoints, i), walls.prev.thickness),
			curr: getWallPoints(Util.getWrapped(wallPoints, i), Util.getWrapped(wallPoints, i + 1), walls.curr.thickness),
			next: getWallPoints(Util.getWrapped(wallPoints, i + 1), Util.getWrapped(wallPoints, i + 2), walls.next.thickness)
		};

		const intersectionInnerPrevCurr = Util.intersectionABandCD(points.prev.p1Inner, points.prev.p2Inner, points.curr.p1Inner, points.curr.p2Inner) ?? points.curr.p1Inner;
		const intersectionOuterPrevCurr = Util.intersectionABandCD(points.prev.p1Outer, points.prev.p2Outer, points.curr.p1Outer, points.curr.p2Outer) ?? points.curr.p1Outer;

		const intersectionInnerCurrNext = Util.intersectionABandCD(points.curr.p1Inner, points.curr.p2Inner, points.next.p1Inner, points.next.p2Inner) ?? points.curr.p2Outer;
		const intersectionOuterCurrNext = Util.intersectionABandCD(points.curr.p1Outer, points.curr.p2Outer, points.next.p1Outer, points.next.p2Outer) ?? points.curr.p2Inner;

		wallPath += Util.polyline([intersectionInnerPrevCurr, intersectionOuterPrevCurr, intersectionOuterCurrNext, intersectionInnerCurrNext]);

		innerPoints.push(intersectionInnerPrevCurr);

		if (!flat.features || flat.features.length == 0) {
			continue;
		}

		const features = [...(flat.features[0].door ?? []), ...(flat.features[0].window ?? []), ...(flat.features[0].furniture ?? [])];

		for (const f of features) {
			const { element, cutoutPath: c } = placeFeature(ctx, flat, walls, points, f) ?? { element: null, c: "" };

			if (!element) {
				continue;
			}

			cutoutPath += c;

			if (f._name == "door") {
				doors.push(element);
			}

			if (f._name == "window") {
				windows.push(element);
			}

			switch (f._name) {
				case "door": doors.push(element); break;
				case "window": windows.push(element); break;
				case "furniture": furnitures.push(element); break;
			}
		}
	}

	Util.create({
		name: "path",
		attributes: { "d": wallPath },
		classes: ["wall"],
		parent: g
	});

	Util.create({
		name: "path",
		attributes: { "d": cutoutPath },
		classes: ["wall-cutout", "floor"],
		parent: g
	});

	Util.create({
		name: "g",
		parent: g,
		children: [...doors, ...windows, ...furnitures]
	});

	const area = Util.polygonArea(innerPoints);
	const areaMeters = Util.round(area / 1000000, 2);

	const roomCenter = polylabel([ innerPoints.map(p => [p.x, p.y]) ], 0.1);
	let areaTextPosition = new Vec(roomCenter[0], roomCenter[1]);

	Util.create({
		name: "text",
		attributes: {
			x: areaTextPosition.x,
			y: areaTextPosition.y,
			"font-size": "300",
			"text-anchor": "middle"
		},
		classes: ["area"],
		parent: g,
		innerHTML: `${areaMeters.toLocaleString("ru-RU")}`
	});
}

function placeFeature(ctx: PlanContext, flat: Flat, walls: any, points: any, f: Door | Window | Furniture): null | {
	element: SVGUseElement,
	cutoutPath: string;
} {
	flat;

	const axes = getAxesFromWallString(f.wall);

	const wallP1 = new Vec(
		ctx.axes.x.get(axes.from1) ?? ctx.axes.x.get(axes.from2) ?? 0,
		ctx.axes.y.get(axes.from1) ?? ctx.axes.y.get(axes.from2) ?? 0
	);

	const wallP2 = new Vec(
		ctx.axes.x.get(axes.to1) ?? ctx.axes.x.get(axes.to2) ?? 0,
		ctx.axes.y.get(axes.to1) ?? ctx.axes.y.get(axes.to2) ?? 0
	);

	const wallV = new Vec(wallP2.x - wallP1.x, wallP2.y - wallP1.y);
	const wallLength = wallV.length();
	const start = f.offset - f.width / 2;
	const end = f.offset + f.width / 2;
	const center = f.offset;
	const pCenter = new Vec(wallP1.x + wallV.x * center / wallLength, wallP1.y + wallV.y * center / wallLength);
	const isFeatureOnThisWall = Util.isPointInPolygon(pCenter, [points.curr.p1Inner, points.curr.p1Outer, points.curr.p2Outer, points.curr.p2Inner]);

	if (!isFeatureOnThisWall) {
		return null;
	}

	const n = new Vec(wallV.y, -wallV.x).normalized();
	let totalOffsetNormal = 0;
	if (f._name == "furniture") {
		totalOffsetNormal = f.offset_normal ?? 0;
	}
	const ct = walls.curr.thickness * 0.5 + totalOffsetNormal;
	const [nx, ny] = [n.x * ct, n.y * ct];

	const pStart = new Vec(wallP1.x + wallV.x * start / wallLength, wallP1.y + wallV.y * start / wallLength);
	const pEnd = new Vec(wallP1.x + wallV.x * end / wallLength, wallP1.y + wallV.y * end / wallLength);

	const p1Inner = new Vec(pStart.x - nx, pStart.y - ny);
	const p1Outer = new Vec(pStart.x + nx, pStart.y + ny);
	const p2Inner = new Vec(pEnd.x - nx, pEnd.y - ny);
	const p2Outer = new Vec(pEnd.x + nx, pEnd.y + ny);
	const cutoutPath = f._name == "furniture" ? "" : Util.polyline([p1Inner, p1Outer, p2Outer, p2Inner]);

	let vFeature = new Vec(pEnd.x - pStart.x, pEnd.y - pStart.y);
	const featureLength = vFeature.length();

	const name = f._name == "furniture" ? f.name : f._name;

	const template = ctx.templates[name];

	if (!template) {
		// ctx.errors.push(planErrors.template_not_found(name, flat.id));
		return null;
	}

	const aspectRatio = parseFloat(template.element.getAttribute("width") ?? "0") / parseFloat(template.element.getAttribute("height") ?? "0");
	let useWidth = featureLength;
	let useHeight = useWidth / aspectRatio;

	let translate = new Vec(p1Outer.x - pCenter.x, p1Outer.y - pCenter.y);

	if (f._name == "door" && f.side == "left") {
		vFeature = new Vec(pStart.x - pEnd.x, pStart.y - pEnd.y);
		translate = new Vec(p2Inner.x - pCenter.x, p2Inner.y - pCenter.y);
	}

	if (f._name == "window") {
		useHeight = ct * 2;
	}

	if (f._name == "furniture") {
		translate = new Vec(p1Inner.x - pCenter.x, p1Inner.y - pCenter.y);
	}

	return {
		element: Util.create({
			name: "use",
			classes: [f._name],
			attributes: {
				href: `#template-${name}`,
				x: pCenter.x,
				y: pCenter.y,
				width: useWidth,
				height: useHeight,
				style: `
					transform-origin: ${pCenter.x}px ${pCenter.y}px;
					rotate: ${Math.atan2(vFeature.y, vFeature.x)}rad;
					translate: ${translate.x}px ${translate.y}px;
				`.trim()
			}
		}),
		cutoutPath
	};
}

async function initDefs(ctx: PlanContext) {
	const defs = Util.create({ name: "defs", parent: ctx.svg });

	ctx.style += `use { transform-origin: center }`;

	const def = ctx.plan.defs[0];

	ctx.style += `
		.wall {
			fill: ${def.color?.find(c => c.name == "wall")?.value ?? "black"};
		}

		.floor {
			fill: ${def.color?.find(c => c.name == "floor")?.value ?? "white"};
		}
	`;

	for (const templ of def.template ?? []) {
		try {
			const text = await (await fetch(`./templates/${templ.path}`)).text();

			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			if (templSvg.querySelector("parsererror")) {
				ctx.errors.push(planErrors.cant_parse_template(templ.name));
				continue;
			}

			const symbol = templSvg.createElementNS("http://www.w3.org/2000/svg", "symbol");
			symbol.id = `template-${templ.name}`;
			[...templSvg.documentElement.children].forEach(c => symbol.appendChild(c));
			for (const attrName of templSvg.documentElement.getAttributeNames()) {
				symbol.setAttribute(attrName, templSvg.documentElement.getAttribute(attrName) ?? "");
			}
			symbol.setAttribute("preserveAspectRatio", "none");
			defs.appendChild(symbol);
			ctx.templates[templ.name] = {
				element: symbol,
				data: templ
			};
		} catch {
			ctx.errors.push(planErrors.cant_parse_template(templ.name));
		}
	}
}

function initAxes(ctx: PlanContext) {
	let maxX = 0;
	let maxY = 0;

	for (const axis of ctx.plan.axes[0].axis) {
		let offset = 0;

		if (axis.offset && typeof axis.offset != "number") {
			// ctx.errors.push(planErrors.axis_offset_not_number(axis.id));
		}

		switch (axis.type) {
			case "horizontal":
				offset = axis.offset ?? 0;
				maxY = Math.max(maxY, offset);
				ctx.axes.y.set(axis.id, offset);
				break;

			case "vertical":
				offset = axis.offset ?? 0;
				maxX = Math.max(maxX, offset);
				ctx.axes.x.set(axis.id, offset);
				break;
		}
	}

	ctx.limits.maxX = maxX;
	ctx.limits.maxY = maxY;

	for (const axis of ctx.plan.axes[0].axis) {
		switch (axis.type) {
			case "horizontal":
				ctx.axes.y.set(axis.id, ctx.limits.maxY - ctx.axes.y.get(axis.id)!);
				break;
		}
	}
}

function drawAxes(ctx: PlanContext) {
	const axesG = Util.create({
		name: "g",
		classes: ["axes"],
		parent: ctx.svg
	});

	// ctx.viewPadding = 1000;

	ctx.style += `
		.wall-cutout {
			fill: #ff0000;
		}
	`;

	ctx.axes.y.forEach((offset, id) => {
		Util.create({
			name: "line",
			attributes: {
				x1: -1000000,
				y1: offset,
				x2: 1000000,
				y2: offset,
				stroke: "#ff000055",
				"stroke-width": "10"
			},
			parent: axesG
		});

		Util.create({
			name: "text",
			attributes: {
				x: -300,
				y: offset - 100,
				"font-size": "200",
				"text-anchor": "middle",
				fill: "red"
			},
			classes: ["axis-label"],
			parent: axesG,
			innerHTML: id
		});
	});

	ctx.axes.x.forEach((offset, id) => {
		Util.create({
			name: "line",
			attributes: {
				x1: offset,
				y1: -1000000,
				x2: offset,
				y2: 1000000,
				stroke: "#ff000055",
				"stroke-width": "10",
			},
			parent: axesG
		});

		Util.create({
			name: "text",
			attributes: {
				x: offset - 100,
				y: -300,
				"font-size": "200",
				"text-anchor": "middle",
				fill: "red"
			},
			classes: ["axis-label"],
			parent: axesG,
			innerHTML: id
		});
	});

	if (ctx.options.debug.axesButtons) {
		ctx.axes.x.forEach((offsetX, idX) => {
			ctx.axes.y.forEach((offsetY, idY) => {
				Util.create({
					name: "rect",
					attributes: {
						x: offsetX - 15,
						y: offsetY - 15,
						width: 30,
						height: 30,
						fill: "blue",
						"data-idx": idX,
						"data-idy": idY,
					},
					parent: axesG,
					classes: ["axes-intersection-button"]
				});
			});
		});
	}
}
