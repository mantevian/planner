import Plan from "./types/Plan";
import Vec from "./types/Vec";
import { getAxes } from "./types/Wall";
import Util from "./util";
import parseElement from "./xml_to_js";

main();

async function main() {
	const res = await fetch("/input.xml");
	const text = await res.text();

	const doc = new DOMParser().parseFromString(text, "application/xml");

	const plan = parseElement(doc.documentElement);

	document.querySelector("#output")!.appendChild(await render(plan));
}

async function render(plan: Plan): Promise<SVGSVGElement> {
	console.log(plan);

	const svg = Util.create({
		name: "svg",
		attributes: {
			viewBox: `0 0 ${plan.size.x} ${plan.size.y}`,
		}
	});

	const defs = Util.create({ name: "defs", parent: svg });

	const styleElement = Util.create({
		name: "style",
		parent: svg
	});

	styleElement.innerHTML += `use { transform-origin: center }`;

	for (const def of plan.defs) {
		styleElement.innerHTML += `
			.room, .axes {
				translate: 1px 1px;
			}

			.wall {
				fill: ${def.color.find(c => c.name == "wall")?.value}
			}

			.floor {
				fill: ${def.color.find(c => c.name == "contour")?.value}
			}
		`;

		def.template.forEach(async (templ) => {

			const text = await (await fetch(`/templates/${templ.name}.svg`)).text();
			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			const symbol = templSvg.createElementNS("http://www.w3.org/2000/svg", "symbol");
			symbol.id = `template-${templ.name}`;
			[...templSvg.documentElement.children].forEach(c => symbol.appendChild(c));
			defs.appendChild(symbol);
		});
	}

	const axesX = new Map<string, number>();
	const axesY = new Map<string, number>();

	let currentAxisX = 0;
	let currentAxisY = 0;

	const axesG = Util.create({
		name: "g",
		classes: ["axes"],
		parent: svg
	});

	for (const axis of plan.axes[0].axis) {
		switch (axis.type) {
			case "horizontal":
				currentAxisY += axis.offset ?? 0;
				axesY.set(axis.id, currentAxisY);

				if (plan.mode == "debug") {
					Util.create({
						name: "line",
						attributes: {
							x1: -plan.size.x.toString(),
							y1: currentAxisY,
							x2: plan.size.x.toString(),
							y2: currentAxisY,
							stroke: "#ff000055",
							"stroke-width": "0.01"
						},
						parent: axesG
					});
				}

				break;

			case "vertical":
				currentAxisX += axis.offset ?? 0;
				axesX.set(axis.id, currentAxisX);

				if (plan.mode == "debug") {
					Util.create({
						name: "line",
						attributes: {
							x1: currentAxisX,
							y1: -plan.size.y.toString(),
							x2: currentAxisX,
							y2: plan.size.y.toString(),
							stroke: "#ff000055",
							"stroke-width": "0.01"
						},
						parent: axesG
					});
				}
				break;
		}
	}

	for (const flat of plan.flat) {
		for (const room of flat.room) {
			const g = Util.create({
				name: "g",
				classes: ["room"],
				parent: svg
			});

			const wallPoints: Vec[] = [];

			for (const wall of room.walls[0].wall) {
				const wallAxes = getAxes(wall);
				let x: number | null = null;
				let y: number | null = null;

				if (axesX.has(wallAxes.from1)) {
					x = axesX.get(wallAxes.from1) ?? 0;
				}

				if (axesX.has(wallAxes.from2)) {
					x = axesX.get(wallAxes.from2) ?? 0;
				}

				if (axesY.has(wallAxes.from1)) {
					y = axesY.get(wallAxes.from1) ?? 0;
				}

				if (axesY.has(wallAxes.from2)) {
					y = axesY.get(wallAxes.from2) ?? 0;
				}

				if (x != null && y != null) {
					wallPoints.push(new Vec(x, y));
				}

				x = null;
				y = null;

				if (axesX.has(wallAxes.to1)) {
					x = axesX.get(wallAxes.to1) ?? 0;
				}

				if (axesX.has(wallAxes.to2)) {
					x = axesX.get(wallAxes.to2) ?? 0;
				}

				if (axesY.has(wallAxes.to1)) {
					y = axesY.get(wallAxes.to1) ?? 0;
				}

				if (axesY.has(wallAxes.to2)) {
					y = axesY.get(wallAxes.to2) ?? 0;
				}

				if (x != null && y != null) {
					wallPoints.push(new Vec(x, y));
				}
			}

			const wallCount = room.walls[0].wall.length;

			// floor
			{
				Util.create({
					name: "path",
					attributes: { "d": Util.polyline(wallPoints) },
					classes: ["floor"],
					parent: g
				});
			}

			// walls
			{
				let path = "";

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

					path += Util.polyline(points);
				}

				Util.create({
					name: "path",
					attributes: { "d": path },
					classes: ["wall"],
					parent: g
				});

				// const features = [...flat.features[0].door, ...flat.features[0].window];
			}

			// use
			{
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
		}
	}

	return svg;
}