import Defs from "./Defs";
import Space from "./Space";
import Vec from "./Vec";

export default class Plan {
	size: Vec;
	space: Space[];
	defs: Defs[];

	constructor(size: Vec) {
		this.size = Vec.clone(size);
		this.space = [];
		this.defs = [];
	}
}