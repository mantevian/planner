import PlanDocElement from "./PlanDocElement";

export default class Template implements PlanDocElement {
	readonly _name = "template";

	wall: string = "";
	name: string = "";
	offset: number = 0;
	width: number = 0;
}