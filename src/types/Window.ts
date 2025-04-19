import PlanDocElement from "./PlanDocElement";

export default class Window implements PlanDocElement {
	readonly _name = "window";

	wall: string = "";
	offset: number = 0.0;
	width: number = 0.0;
}