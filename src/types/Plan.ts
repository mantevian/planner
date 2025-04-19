import Axes from "./Axes";
import Defs from "./Defs";
import Flat from "./Flat";
import PlanDocElement from "./PlanDocElement";
import Vec from "./Vec";

export default class Plan implements PlanDocElement {
	readonly _name = "plan";

	size: Vec;
	flat: Flat[] = [];
	defs: Defs[] = [];
	axes: Axes[] = [];
	mode: "debug" | null = null;

	constructor(size: Vec) {
		this.size = Vec.clone(size);
	}
}