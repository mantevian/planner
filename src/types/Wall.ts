import Door from "./Door";
import Window from "./Window";

export default class Wall {
	from?: string = "";
	to?: string = "";
	width: number = 0.1;

	window: Window[] = [];
	door: Door[] = [];
}