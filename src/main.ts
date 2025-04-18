import { CodeJar } from "codejar";
import Flat from "./types/Flat";
import Plan from "./types/Plan";
import Room from "./types/Room";
import Vec from "./types/Vec";
import { getAxesFromWall, getAxesFromWallString } from "./types/Wall";
import Util from "./util";
import parseElement from "./xml_to_js";

main();

type PlanContext = {
	plan: Plan;
	svg: SVGSVGElement;
	axes: {
		x: Map<string, number>,
		y: Map<string, number>;
	};
};

async function main() {
	const res = await fetch("./input.xml");
	const text = await res.text();
	const ctx = await run(text);
	updateOutput(ctx.svg);

	const inputElement = document.querySelector("#input")! as HTMLElement;
	inputElement.textContent = text;

	CodeJar(inputElement, () => { });

	inputElement.addEventListener("input", async () => {
		const ctx = await run(inputElement.textContent ?? "");
		updateOutput(ctx.svg);
	});
}

function updateOutput(svg: SVGSVGElement) {
	document.querySelector("#output")!.replaceChildren(svg);
}

async function run(input: string) {
	const doc = new DOMParser().parseFromString(input, "application/xml");

	const plan: Plan = parseElement(doc.documentElement);

	const ctx: PlanContext = {
		plan,
		svg: Util.create({
			name: "svg",
			attributes: {
				viewBox: `0 0 ${plan.size.x} ${plan.size.y}`,
			}
		}),
		axes: {
			x: new Map<string, number>(),
			y: new Map<string, number>()
		}
	};

	await render(ctx);

	return ctx;
}

async function render(ctx: PlanContext) {
	console.log(ctx.plan);

	initDefs(ctx);
	initAxes(ctx);

	for (const flat of ctx.plan.flat) {
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

		const features = [...(flat.features[0].door ?? []), ...(flat.features[0].window ?? [])];

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
			const start = f.offset;
			const end = f.offset + f.width;
			const center = (start + end) / 2;
			const v = new Vec(c2.x - c1.x, c2.y - c1.y);
			const n = new Vec(v.y, -v.x).normalized();
			const ct = w.thickness * 0.54;

			const p1Inner = new Vec(c1.x + v.x * start / l + n.x * -ct, c1.y + v.y * start / l + n.y * -ct);
			const p1Outer = new Vec(c1.x + v.x * start / l + n.x * ct, c1.y + v.y * start / l + n.y * ct);
			const p2Inner = new Vec(c1.x + v.x * end / l + n.x * -ct, c1.y + v.y * end / l + n.y * -ct);
			const p2Outer = new Vec(c1.x + v.x * end / l + n.x * ct, c1.y + v.y * end / l + n.y * ct);
			const pCenter = new Vec(c1.x + v.x * center / l, c1.y + v.y * center / l);
			const isFeatureOnThisWall = Util.isPointInPolygon(pCenter, [aInner, aOuter, bOuter, bInner]);

			if (isFeatureOnThisWall) {
				cutoutPath += Util.polyline([p1Inner, p1Outer, p2Outer, p2Inner]);
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
		classes: ["wall-cutout"],
		parent: g
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
			.room, .axes {
				translate: 1000px 1000px;
			}

			.wall {
				fill: ${def.color?.find(c => c.name == "wall")?.value};
			}

			.floor {
				fill: ${def.color?.find(c => c.name == "floor")?.value};
			}

			.wall-cutout {
				fill: ${def.color?.find(c => c.name == "floor")?.value};
			}
		`;

		def.template?.forEach(async (templ) => {
			const text = await (await fetch(`/templates/${templ.name}.svg`)).text();
			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			const symbol = templSvg.createElementNS("http://www.w3.org/2000/svg", "symbol");
			symbol.id = `template-${templ.name}`;
			[...templSvg.documentElement.children].forEach(c => symbol.appendChild(c));
			defs.appendChild(symbol);
		});
	}
}

function initAxes(ctx: PlanContext) {
	const axesG = Util.create({
		name: "g",
		classes: ["axes"],
		parent: ctx.svg
	});

	for (const axis of ctx.plan.axes[0].axis) {
		switch (axis.type) {
			case "horizontal":
				ctx.axes.y.set(axis.id, axis.offset ?? 0);

				if (ctx.plan.mode == "debug") {
					Util.create({
						name: "line",
						attributes: {
							x1: -ctx.plan.size.x.toString(),
							y1: axis.offset ?? 0,
							x2: ctx.plan.size.x.toString(),
							y2: axis.offset ?? 0,
							stroke: "#ff000055",
							"stroke-width": "10"
						},
						parent: axesG
					});
				}

				break;

			case "vertical":
				ctx.axes.x.set(axis.id, axis.offset ?? 0);

				if (ctx.plan.mode == "debug") {
					Util.create({
						name: "line",
						attributes: {
							x1: axis.offset ?? 0,
							y1: -ctx.plan.size.y.toString(),
							x2: axis.offset ?? 0,
							y2: ctx.plan.size.y.toString(),
							stroke: "#ff000055",
							"stroke-width": "10"
						},
						parent: axesG
					});
				}
				break;
		}
	}
}