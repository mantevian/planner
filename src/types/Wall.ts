import Door from "./Door";
import Window from "./Window";

export default class Wall {
	from?: string = "";
	to?: string = "";
	thickness: number = 0;

	window: Window[] = [];
	door: Door[] = [];
}

export function getAxesFromWall(wall: Wall) {
	const axesFrom = (wall.from || "").trim().split(" ");
	const axesTo = (wall.to || "").trim().split(" ");

	return {
		from1: axesFrom[0],
		from2: axesFrom[1],
		to1: axesTo[0],
		to2: axesTo[1]
	};
}

export function getAxesFromWallString(wall: string) {
	const points = wall.trim().split(",");
	const axesFrom = points[0].trim().split(" ");
	const axesTo = points[1].trim().split(" ");

	return {
		from1: axesFrom[0],
		from2: axesFrom[1],
		to1: axesTo[0],
		to2: axesTo[1]
	};
}