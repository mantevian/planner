import PlanDocElement from "./PlanDocElement";

export default class Door implements PlanDocElement {
	readonly _name = "door";

	wall: string = "";
	offset: number = 0.0;
	width: number = 0.0;
	side: "left" | "right" = "right";
}