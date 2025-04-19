import PlanDocElement from "./PlanDocElement";
import Walls from "./Walls";

export default class Room implements PlanDocElement {
	readonly _name = "room";

	id: string = "";
	walls: Walls[] = [];
}