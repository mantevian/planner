import Axes from "./Axes";
import Defs from "./Defs";
import Flat from "./Flat";
import PlanDocElement from "./PlanDocElement";

export default class Plan implements PlanDocElement {
	readonly _name = "plan";

	flat: Flat[] = [];
	defs: Defs[] = [];
	axes: Axes[] = [];
	mode: "debug" | null = null;
	errors: string = "note warn error";
}
