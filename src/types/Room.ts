import PlanDocElement from "./PlanDocElement";
import Walls from "./Walls";

export default class Room implements PlanDocElement {
	readonly _name = "room";

	area_override?: number = undefined;
	area_offset_x: number = 0;
	area_offset_y: number = 0;
	walls: Walls[] = [];
}