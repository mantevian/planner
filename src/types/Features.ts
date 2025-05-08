import Door from "./Door";
import Furniture from "./Furniture";
import PlanDocElement from "./PlanDocElement";
import Window from "./Window";

export default class Features implements PlanDocElement {
	readonly _name = "features";

	window: Window[] = [];
	door: Door[] = [];
	furniture: Furniture[] = [];
}
