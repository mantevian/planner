import Features from "./Features";
import PlanDocElement from "./PlanDocElement";
import Room from "./Room";

export default class Flat implements PlanDocElement {
	readonly _name = "flat";

	id: string = "";
	features: Features[] = [];
	room: Room[] = [];
}