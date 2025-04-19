import Axis from "./Axis";
import PlanDocElement from "./PlanDocElement";

export default class Axes implements PlanDocElement {
	readonly _name = "axes";

	axis: Axis[] = [];
}