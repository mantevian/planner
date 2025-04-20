import Door from "./Door";
import PlanDocElement from "./PlanDocElement";
import Template from "./Template";
import Window from "./Window";

export default class Features implements PlanDocElement {
	readonly _name = "features";

	window: Window[] = [];
	door: Door[] = [];
	template: Template[] = [];
}