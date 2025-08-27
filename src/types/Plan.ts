import Axes from "./Axes";
import Defs from "./Defs";
import Flat from "./Flat";
import PlanDocElement from "./PlanDocElement";
import Walls from "./Walls";

export default class Plan implements PlanDocElement {
	readonly _name = "plan";

	flat: Flat[] = [];
	defs: Defs[] = [];
	axes: Axes[] = [];
	walls: Walls[] = [];
}
