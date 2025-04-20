import { CodeJar } from "codejar";
import Flat from "./types/Flat";
import Plan from "./types/Plan";
import Room from "./types/Room";
import Vec from "./types/Vec";
import { getAxesFromWall, getAxesFromWallString } from "./types/Wall";
import Util from "./util";
import parseElement from "./xml_to_js";
import Door from "./types/Door";

main();

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
};

type PlannerOptions = {
	input: string;
	viewFlatId?: string;
};

async function main() {
	const res = await fetch("./input.xml");
	const text = await res.text();

	const viewFlatIdInput: HTMLInputElement = document.querySelector("input[name='view-flat-id']")!;
	const planInputElement: HTMLDivElement = document.querySelector("#input")!;
	planInputElement.textContent = text;

	CodeJar(planInputElement, () => { });

	let options: PlannerOptions = { input: text };

	updateOutput(options);

	planInputElement.addEventListener("input", async () => {
		options.input = planInputElement.textContent ?? "";
		updateOutput(options);
	});

	viewFlatIdInput.addEventListener("input", async () => {
		const id = viewFlatIdInput.value;
		options.viewFlatId = id;
		updateOutput(options);
	});
}

function updateOutput(options: PlannerOptions) {
	run(options).then(ctx => {
		document.querySelector("#output")!.replaceChildren(ctx.svg);
	});
}

async function run(options: PlannerOptions) {
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
		templates: {}
	};

	await render(ctx);

	return ctx;
}

async function render(ctx: PlanContext) {
	console.log(ctx.plan);

	await initDefs(ctx);
	initAxes(ctx);

	for (const flat of ctx.plan.flat) {
		createFlat(ctx, flat);
	}

	ctx.svg.setAttribute("viewBox", `${ctx.limits.minX - 1000} ${ctx.limits.minY - 1000} ${ctx.limits.maxX - ctx.limits.minX + 2000} ${ctx.limits.maxY - ctx.limits.minY + 2000}`);
}

function getFlatPosition(ctx: PlanContext, flat: Flat) {
	let minX = 1000000;
	let minY = 1000000;
	let maxX = 0;
	let maxY = 0;

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
		for (const room of flat.room) {
			createRoom(ctx, flat, room);
		}
	}
}

function createRoom(ctx: PlanContext, flat: Flat, room: Room) {
	const g = Util.create({
		name: "g",
		classes: ["room"],
		parent: ctx.svg
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

	const wallCount = room.walls[0].wall.length;

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

	let wallNormals: Vec[] = [];

	for (let i = 0; i < wallCount; i++) {
		const c1 = wallPoints[i];
		const c2 = wallPoints[(i + 1) % wallCount];

		const v = new Vec(c2.x - c1.x, c2.y - c1.y);
		const n = new Vec(v.y, -v.x).normalized();

		wallNormals.push(n);
	}

	for (let i = 0; i < wallCount; i++) {
		const w = room.walls[0].wall[i];
		const nextWall = room.walls[0].wall[(i + 1) % wallCount];

		const c1 = wallPoints[i];
		const c2 = wallPoints[(i + 1) % wallCount];
		const c3 = wallPoints[(i + 2) % wallCount];

		const n = wallNormals[i];
		const nextWallN = wallNormals[(i + 1) % wallCount];

		let shouldFillCorner = Vec.angle(n, nextWallN) < Math.PI;

		let points: Vec[] = [];

		const ct = w.thickness / 2;
		const nt = nextWall.thickness / 2;

		const aInner = new Vec(c1.x + n.x * -ct, c1.y + n.y * -ct);
		const aOuter = new Vec(c1.x + n.x * ct, c1.y + n.y * ct);

		const bInner = new Vec(c2.x + n.x * -ct, c2.y + n.y * -ct);
		const bOuter = new Vec(c2.x + n.x * ct, c2.y + n.y * ct);

		const cInner = new Vec(c2.x + nextWallN.x * -nt, c2.y + nextWallN.y * -nt);
		const cOuter = new Vec(c2.x + nextWallN.x * nt, c2.y + nextWallN.y * nt);

		const dInner = new Vec(c3.x + nextWallN.x * -nt, c3.y + nextWallN.y * -nt);
		const dOuter = new Vec(c3.x + nextWallN.x * nt, c3.y + nextWallN.y * nt);

		const intersectionInner = Util.intersectionABandCD(aInner, bInner, cInner, dInner) ?? bInner;
		const intersectionOuter = Util.intersectionABandCD(aOuter, bOuter, cOuter, dOuter) ?? bOuter;

		points.push(aInner, aOuter);

		if (shouldFillCorner) {
			points.push(bOuter, intersectionOuter, cOuter, bInner);
		} else {
			points.push(bOuter, cInner, intersectionInner);
		}

		wallPath += Util.polyline(points);

		const features = [...(flat.features[0].door ?? []), ...(flat.features[0].window ?? []), ...(flat.features[0].template ?? [])];

		for (const f of features) {
			const axes = getAxesFromWallString(f.wall);

			const c1 = new Vec(
				ctx.axes.x.get(axes.from1) ?? ctx.axes.x.get(axes.from2) ?? 0,
				ctx.axes.y.get(axes.from1) ?? ctx.axes.y.get(axes.from2) ?? 0
			);

			const c2 = new Vec(
				ctx.axes.x.get(axes.to1) ?? ctx.axes.x.get(axes.to2) ?? 0,
				ctx.axes.y.get(axes.to1) ?? ctx.axes.y.get(axes.to2) ?? 0
			);

			const l = new Vec(c2.x - c1.x, c2.y - c1.y).length();
			const start = f.offset - f.width / 2;
			const end = f.offset + f.width / 2;
			const center = f.offset;
			const v = new Vec(c2.x - c1.x, c2.y - c1.y);

			const pCenter = new Vec(c1.x + v.x * center / l, c1.y + v.y * center / l);
			const isFeatureOnThisWall = Util.isPointInPolygon(pCenter, [aInner, aOuter, bOuter, bInner]);

			if (isFeatureOnThisWall) {
				const n = new Vec(v.y, -v.x).normalized();
				const ct = w.thickness * 0.54;

				const p1Inner = new Vec(c1.x + v.x * start / l + n.x * -ct, c1.y + v.y * start / l + n.y * -ct);
				const p1Outer = new Vec(c1.x + v.x * start / l + n.x * ct, c1.y + v.y * start / l + n.y * ct);
				const p2Inner = new Vec(c1.x + v.x * end / l + n.x * -ct, c1.y + v.y * end / l + n.y * -ct);
				const p2Outer = new Vec(c1.x + v.x * end / l + n.x * ct, c1.y + v.y * end / l + n.y * ct);

				cutoutPath += Util.polyline([p1Inner, p1Outer, p2Outer, p2Inner]);

				const pStart = new Vec(c1.x + v.x * start / l, c1.y + v.y * start / l);
				const pEnd = new Vec(c1.x + v.x * end / l, c1.y + v.y * end / l);
				const vFeature = new Vec(pEnd.x - pStart.x, pEnd.y - pStart.y);

				const featureLength = vFeature.length();

				const template = f._name == "template" ? ctx.templates[f.name] : ctx.templates[f._name];

				if (template) {
					const aspectRatio = parseFloat(template.getAttribute("width") ?? "0") / parseFloat(template.getAttribute("height") ?? "0");
					let useWidth = featureLength;
					let useHeight = useWidth / aspectRatio;

					const translate = new Vec(p1Outer.x - pCenter.x, p1Outer.y - pCenter.y);

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
		innerHTML: `${areaMeters} m²`
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
			const text = await (await fetch(`/templates/${templ.name}.svg`)).text();
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