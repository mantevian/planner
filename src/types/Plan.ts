import Axes from "./Axes";
import Defs from "./Defs";
import Flat from "./Flat";
import Vec from "./Vec";

export default class Plan {
	size: Vec;
	flat: Flat[] = [];
	defs: Defs[] = [];
	axes: Axes[] = [];

	constructor(size: Vec) {
		this.size = Vec.clone(size);
	}
}