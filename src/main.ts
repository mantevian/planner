import Plan from "./types/Plan";
import Vec from "./types/Vec";
import Wall from "./types/Wall.ts";
import Util from "./util";
import parseElement from "./xml_to_js";

main();

function getAxes(wall: Wall) {
	const axesFrom = (wall.from || "").trim().split(" ");
	const axesTo = (wall.to || "").trim().split(" ");

	return {
		from1: axesFrom[0],
		from2: axesFrom[1],
		to1: axesTo[0],
		to2: axesTo[1]
	};
}

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
			width: `${plan.size.x * 100}`,
			height: `${plan.size.y * 100}`
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
			.room {
				translate: 1px 1px;
			}

			.wall {
				fill: ${def.color.find(c => c.name == "wall")?.value}
			}

			.contour {
				fill: ${def.color.find(c => c.name == "contour")?.value}
			}
		`;

		for (const templ of def.template) {
			const text = await (await fetch(`/templates/${templ.name}.svg`)).text();
			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			const symbol = templSvg.createElementNS("http://www.w3.org/2000/svg", "symbol");
			symbol.id = `template-${templ.name}`;
			templSvg.childNodes.forEach(c => symbol.appendChild(c));
			defs.appendChild(symbol);
		}
	}

	const axesX = new Map<string, number>();
	const axesY = new Map<string, number>();

	let currentAxisX = 0;
	let currentAxisY = 0;

	for (const axis of plan.axes[0].axis) {
		switch (axis.type) {
			case "horizontal":
				currentAxisY += axis.offset ?? 0;
				axesY.set(axis.id, currentAxisY);
				break;

			case "vertical":
				currentAxisX += axis.offset ?? 0;
				axesX.set(axis.id, currentAxisX);
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
				let x: number | null = null;
				let y: number | null = null;
				const wallAxes = getAxes(wall);

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

			// contour
			{
				Util.create({
					name: "path",
					attributes: { "d": Util.polyline(wallPoints) },
					classes: ["contour"],
					parent: g
				});
			}

			// walls
			{
				let path = "";

				let wallNormals: Vec[] = [];

				const count = room.walls[0].wall.length;

				for (let i = 0; i < count; i++) {
					const c1 = wallPoints[i];
					const c2 = wallPoints[(i + 1) % count];

					const v = new Vec(c2.x - c1.x, c2.y - c1.y);
					const n = new Vec(v.y, -v.x).normalized();

					wallNormals.push(n);
				}

				for (let i = 0; i < count; i++) {
					const w = room.walls[0].wall[i];
					const nextWall = room.walls[0].wall[(i + 1) % count];

					const c1 = wallPoints[i];
					const c2 = wallPoints[(i + 1) % count];
					const c3 = wallPoints[(i + 2) % count];

					const n = wallNormals[i];
					const nextWallN = wallNormals[(i + 1) % count];

					let shouldFillCorner = Vec.angle(n, nextWallN) < Math.PI;

					let points: Vec[] = [];

					const cw = w.width / 2;
					const nw = nextWall.width / 2;

					const aInner = new Vec(c1.x + n.x * -cw, c1.y + n.y * -cw);
					const aOuter = new Vec(c1.x + n.x * cw, c1.y + n.y * cw);

					const bInner = new Vec(c2.x + n.x * -cw, c2.y + n.y * -cw);
					const bOuter = new Vec(c2.x + n.x * cw, c2.y + n.y * cw);

					const cInner = new Vec(c2.x + nextWallN.x * -nw, c2.y + nextWallN.y * -nw);
					const cOuter = new Vec(c2.x + nextWallN.x * nw, c2.y + nextWallN.y * nw);

					const dInner = new Vec(c3.x + nextWallN.x * -nw, c3.y + nextWallN.y * -nw);
					const dOuter = new Vec(c3.x + nextWallN.x * nw, c3.y + nextWallN.y * nw);

					const intersectionInner = intersectionABandCD(aInner, bInner, cInner, dInner) ?? bInner;
					const intersectionOuter = intersectionABandCD(aOuter, bOuter, cOuter, dOuter) ?? bOuter;

					if (shouldFillCorner) {
						points.push(aInner, aOuter, bOuter, intersectionOuter, cOuter, bInner);
					} else {
						points.push(aInner, aOuter, bOuter, cInner, intersectionInner);
					}

					path += Util.polyline(points);
				}

				Util.create({
					name: "path",
					attributes: { "d": path },
					classes: ["wall"],
					parent: g
				});
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

function intersectionABandCD(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
	const x1 = a.x, y1 = a.y;
	const x2 = b.x, y2 = b.y;
	const x3 = c.x, y3 = c.y;
	const x4 = d.x, y4 = d.y;

	const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

	if (denominator == 0) {
		return null;
	}

	const t = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;

	const x = x1 + t * (x2 - x1);
	const y = y1 + t * (y2 - y1);

	return new Vec(x, y);
}