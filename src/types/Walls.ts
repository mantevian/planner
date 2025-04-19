import PlanDocElement from "./PlanDocElement";
import Wall from "./Wall";

export default class Walls implements PlanDocElement {
	readonly _name = "walls";

	wall: Wall[] = [];
}