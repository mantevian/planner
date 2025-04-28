import Flat from "./types/Flat";
import Plan from "./types/Plan";
import Room from "./types/Room";
import Vec from "./types/Vec";
import { getAxesFromWall, getAxesFromWallString } from "./types/Wall";
import Util from "./util";
import parseElement from "./xml_to_js";

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
	templates: { [key: string]: SVGSymbolElement; };
	viewPadding: number;
};

export type PlannerOptions = {
	input: string;
	viewFlatId?: string;
};

export async function render(options: PlannerOptions) {
	const doc = new DOMParser().parseFromString(options.input, "application/xml");

	const plan: Plan = parseElement(doc.documentElement);

	const ctx: PlanContext = {
		plan,
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
		viewPadding: 500
	};

	await initDefs(ctx);
	initAxes(ctx);

	if (!ctx.plan.flat || ctx.plan.flat.length == 0) {
		return ctx;
	}

	for (const flat of ctx.plan.flat) {
		createFlat(ctx, flat);
	}

	ctx.svg.setAttribute("viewBox", `${ctx.limits.minX - ctx.viewPadding} ${ctx.limits.minY - ctx.viewPadding} ${ctx.limits.maxX - ctx.limits.minX + ctx.viewPadding * 2} ${ctx.limits.maxY - ctx.limits.minY + ctx.viewPadding * 2}`);

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
			return;
		}

		const g = Util.create({
			name: "g",
			classes: ["flat"],
			parent: ctx.svg,
			id: `flat-${flat.id}`
		});

		for (const room of flat.room) {
			createRoom(ctx, flat, room, g);
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

function createRoom(ctx: PlanContext, flat: Flat, room: Room, flatGroup: SVGGElement) {
	if (!room.walls || !room.walls[0]) {
		return;
	}

	const g = Util.create({
		name: "g",
		classes: ["room"],
		parent: flatGroup
	});

	const wallPoints: Vec[] = [];
	const doors: SVGUseElement[] = [];
	const windows: SVGUseElement[] = [];

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

		if (flat.features && flat.features.length > 0) {
			const features = [...(flat.features[0].door ?? []), ...(flat.features[0].window ?? []), ...(flat.features[0].template ?? [])];

			for (const f of features) {
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

				if (isFeatureOnThisWall) {
					const n = new Vec(wallV.y, -wallV.x).normalized();
					const ct = walls.curr.thickness * 0.5;

					const p1Inner = new Vec(wallP1.x + wallV.x * start / wallLength + n.x * -ct, wallP1.y + wallV.y * start / wallLength + n.y * -ct);
					const p1Outer = new Vec(wallP1.x + wallV.x * start / wallLength + n.x * ct, wallP1.y + wallV.y * start / wallLength + n.y * ct);
					const p2Inner = new Vec(wallP1.x + wallV.x * end / wallLength + n.x * -ct, wallP1.y + wallV.y * end / wallLength + n.y * -ct);
					const p2Outer = new Vec(wallP1.x + wallV.x * end / wallLength + n.x * ct, wallP1.y + wallV.y * end / wallLength + n.y * ct);
					cutoutPath += Util.polyline([p1Inner, p1Outer, p2Outer, p2Inner]);

					const pStart = new Vec(wallP1.x + wallV.x * start / wallLength, wallP1.y + wallV.y * start / wallLength);
					const pEnd = new Vec(wallP1.x + wallV.x * end / wallLength, wallP1.y + wallV.y * end / wallLength);
					const vFeature = new Vec(pEnd.x - pStart.x, pEnd.y - pStart.y);

					const featureLength = vFeature.length();

					const template = f._name == "template" ? ctx.templates[f.name] : ctx.templates[f._name];

					if (template) {
						const aspectRatio = parseFloat(template.getAttribute("width") ?? "0") / parseFloat(template.getAttribute("height") ?? "0");
						let useWidth = featureLength;
						let useHeight = useWidth / aspectRatio;

						let translate = new Vec(p1Outer.x - pCenter.x, p1Outer.y - pCenter.y);

						if (f._name == "window") {
							useHeight = ct * 2;
						}

						const el = Util.create({
							name: "use",
							attributes: {
								href: `#template-${f._name}`,
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
						});

						if (f._name == "door") {
							doors.push(el);
						}

						if (f._name == "window") {
							windows.push(el);
						}
					}
				}
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
		children: [...doors, ...windows]
	});

	const area = Util.polygonArea(wallPoints);
	const areaMeters = Util.round(area / 1000000, 2);
	const roomCenter = Util.polygonCenter(wallPoints);

	Util.create({
		name: "text",
		attributes: {
			x: roomCenter.x,
			y: roomCenter.y,
			"font-size": "200",
			"text-anchor": "middle"
		},
		classes: ["area"],
		parent: g,
		innerHTML: `${areaMeters} м²`
	});

	// use

	// for (const use of room.use ?? []) {
	// 	Util.create({
	// 		name: "use",
	// 		attributes: {
	// 			href: `#template-${use.name}`,
	// 			x: `${use.pos.x}`,
	// 			y: `${use.pos.y}`,
	// 			width: `${use.size.x}`,
	// 			height: `${use.size.y}`,
	// 		},
	// 		parent: g
	// 	});
	// }
}

async function initDefs(ctx: PlanContext) {
	const defs = Util.create({ name: "defs", parent: ctx.svg });

	const styleElement = Util.create({
		name: "style",
		parent: ctx.svg
	});

	styleElement.innerHTML += `use { transform-origin: center }`;

	for (const def of ctx.plan.defs) {
		styleElement.innerHTML += `
			.wall {
				fill: ${def.color?.find(c => c.name == "wall")?.value};
			}

			.floor {
				fill: ${def.color?.find(c => c.name == "floor")?.value};
			}
		`;

		for (const templ of def.template ?? []) {
			const text = await (await fetch(`./templates/${templ.name}.svg`)).text();
			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			const symbol = templSvg.createElementNS("http://www.w3.org/2000/svg", "symbol");
			symbol.id = `template-${templ.name}`;
			[...templSvg.documentElement.children].forEach(c => symbol.appendChild(c));
			for (const attrName of templSvg.documentElement.getAttributeNames()) {
				symbol.setAttribute(attrName, templSvg.documentElement.getAttribute(attrName) ?? "");
			}
			symbol.setAttribute("preserveAspectRatio", "none");
			defs.appendChild(symbol);
			ctx.templates[templ.name] = symbol;
		}
	}
}

function initAxes(ctx: PlanContext) {
	const axesG = Util.create({
		name: "g",
		classes: ["axes"],
		parent: ctx.svg
	});

	let maxX = 0;
	let maxY = 0;

	if (ctx.plan.mode == "debug") {
		ctx.viewPadding = 1000;
	}

	for (const axis of ctx.plan.axes[0].axis) {
		let offset = 0;

		switch (axis.type) {
			case "horizontal":
				offset = axis.offset ?? 0;
				maxY = Math.max(maxY, offset);
				ctx.axes.y.set(axis.id, offset);

				if (ctx.plan.mode == "debug") {
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
							x: -700,
							y: offset - 100,
							"font-size": "200",
							"text-anchor": "middle",
							fill: "red"
						},
						classes: ["axis-label"],
						parent: axesG,
						innerHTML: `${axis.id}`
					});
				}
				break;

			case "vertical":
				offset = axis.offset ?? 0;
				maxX = Math.max(maxX, offset);
				ctx.axes.x.set(axis.id, offset);

				if (ctx.plan.mode == "debug") {
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
							y: -700,
							"font-size": "200",
							"text-anchor": "middle",
							fill: "red"
						},
						classes: ["axis-label"],
						parent: axesG,
						innerHTML: `${axis.id}`
					});
				}
				break;
		}
	}

	ctx.limits.maxX = maxX;
	ctx.limits.maxY = maxY;
}