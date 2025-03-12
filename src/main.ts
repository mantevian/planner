import Plan from "./types/Plan.ts";
import Vec from "./types/Vec.ts";
import Util from "./util.ts";
import parseElement from "./xml_to_js.ts";

async function main() {
	const res = await fetch("/input.xml");
	const text = await res.text();

	const doc = new DOMParser().parseFromString(text, "application/xml");

	const plan = parseElement(doc.documentElement);

	document.querySelector("#output")!.appendChild(await render(plan));
}

main();

async function render(plan: Plan): Promise<SVGSVGElement> {
	console.log(plan);

	const svg = Util.create({
		name: "svg",
		attributes: {
			viewBox: `0 0 ${plan.size.x} ${plan.size.y}`,
			width: `${plan.size.x}`,
			height: `${plan.size.y}`
		}
	});

	const defs = Util.create({ name: "defs", parent: svg });

	const styleElement = Util.create({
		name: "style",
		parent: svg
	});

	styleElement.innerHTML += `use { transform-origin: center }`;

	for (const def of plan.defs) {
		styleElement.innerHTML += `.wall { fill: ${def.color.find(c => c.name == "wall")?.value} }`;
		styleElement.innerHTML += `.contour { fill: ${def.color.find(c => c.name == "contour")?.value} }`;

		for (const templ of def.template) {
			const text = await (await fetch(`/templates/${templ.name}.svg`)).text();
			const templSvg = new DOMParser().parseFromString(text, "image/svg+xml");
			templSvg.documentElement.id = `template-${templ.name}`;
			defs.appendChild(templSvg.documentElement);
		}
	}

	for (const space of plan.space) {
		const g = Util.create({
			name: "g",
			classes: ["space"],
			parent: svg
		});

		if (!space.wall || !space.contour) {
			break;
		}

		const count = space.wall.length;

		// contour
		{
			Util.create({
				name: "path",
				attributes: { "d": Util.polyline(space.contour) },
				classes: ["contour"],
				parent: g
			});
		}

		// walls
		{
			let path = "";

			let wallNormals: Vec[] = [];

			for (let i = 0; i < count; i++) {
				const c1 = space.contour[i];
				const c2 = space.contour[(i + 1) % count];

				const v = new Vec(c2.x - c1.x, c2.y - c1.y);
				const n = new Vec(v.y, -v.x).normalized();

				wallNormals.push(n);
			}

			for (let i = 0; i < count; i++) {
				const w = space.wall[i];
				const prevWall = space.wall[(i + count - 1) % count];
				const nextWall = space.wall[(i + 1) % count];

				const c1 = space.contour[i];
				const c2 = space.contour[(i + 1) % count];

				const v = new Vec(c2.x - c1.x, c2.y - c1.y).normalized();

				const prevWallN = wallNormals[(i + count - 1) % count];
				const nextWallN = wallNormals[(i + 1) % count];
				const n = wallNormals[i];

				let shouldFillPrevCorner = Vec.angle(prevWallN, n) < Math.PI;
				let shouldFillNextCorner = Vec.angle(n, nextWallN) < Math.PI;

				let points: Vec[] = [];

				if (shouldFillPrevCorner) {
					points.push(
						new Vec(c1.x + n.x * w.from - v.x * prevWall.to, c1.y + n.y * w.from - v.y * prevWall.to),
						new Vec(c1.x + n.x * w.to - v.x * prevWall.to, c1.y + n.y * w.to - v.y * prevWall.to),
					);
				} else {
					points.push(
						new Vec(c1.x + n.x * w.from, c1.y + n.y * w.from),
						new Vec(c1.x + n.x * w.to, c1.y + n.y * w.to),
					);
				}

				if (shouldFillNextCorner) {
					points.push(
						new Vec(c2.x + n.x * w.to + v.x * nextWall.to, c2.y + n.y * w.to + v.y * nextWall.to),
						new Vec(c2.x + n.x * w.from + v.x * nextWall.to, c2.y + n.y * w.from + v.y * nextWall.to),
					);
				} else {
					points.push(
						new Vec(c2.x + n.x * w.to, c2.y + n.y * w.to),
						new Vec(c2.x + n.x * w.from, c2.y + n.y * w.from),
					);
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
			for (const use of space.use ?? []) {
				Util.create({
					name: "use",
					attributes: {
						href: `#template-${use.name}`,
						x: `${use.pos.x}`,
						y: `${use.pos.y}`,
						width: `${use.size.x}`,
						height: `${use.size.y}`,
					},
					parent: g
				});

				if (use.rotate && use.rotate != 0) {
					styleElement.innerHTML += `use[href='#template-${use.name}'] { rotate: ${use.rotate}deg }`;
				}
			}
		}
	}

	return svg;
}