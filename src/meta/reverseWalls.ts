import Wall from "../types/Wall";
import Walls from "../types/Walls";
import Util from "../util";
import parseElement, { objToXML } from "../xml";

export default function reverseWalls(input: string): string {
	const doc = new DOMParser().parseFromString(input, "application/xml");
	const walls: Walls = parseElement(doc.documentElement, 1);

	const points = [walls.wall[0].from!, walls.wall[0].to!];

	const count = walls.wall.length;

	for (let i = 1; i < count - 1; i++) {
		points.push(walls.wall[i].to!);
	}

	points.reverse();

	const thicknesses = walls.wall.map(w => w.thickness);

	const resultWalls: Wall[] = [];

	resultWalls.push({
		_name: "wall",
		thickness: thicknesses[count - 2],
		from: points[0],
		to: points[1]
	});

	for (let i = 1; i < count - 1; i++) {
		resultWalls.push({
			_name: "wall",
			thickness: Util.getWrapped(thicknesses, count - i - 2),
			to: points[i + 1]
		});
	}

	resultWalls.push({
		_name: "wall",
		thickness: thicknesses[count - 1]
	});

	console.log(resultWalls)

	return objToXML({
		_name: "walls",
		wall: resultWalls
	}, 1).outerHTML;
}