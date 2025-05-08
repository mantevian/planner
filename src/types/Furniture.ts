import PlanDocElement from "./PlanDocElement";

export default class Furniture implements PlanDocElement {
	readonly _name = "furniture";

	wall: string = "";
	name: string = "";
	offset: number = 0;
	offset_normal: number = 0;
	width: number = 0;
}
