import PlanDocElement from "./PlanDocElement";

export default class Door implements PlanDocElement {
	readonly _name = "door";

	wall: string = "";
	offset: number = 0.0;
	width: number = 0.0;
	height?: number = undefined;
	rotate: number = 0;
	side: "left" | "right" = "right";
	mirror: boolean = false;
}