import PlanDocElement from "./PlanDocElement";

export default class Axis implements PlanDocElement {
	readonly _name = "axis";

	id: string = "";
	type: "vertical" | "horizontal" = "horizontal";
	offset?: number = 0;
}