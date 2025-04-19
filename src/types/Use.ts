import PlanDocElement from "./PlanDocElement";
import Vec from "./Vec";

export default class Use implements PlanDocElement {
	readonly _name = "use";

	name: string;
	pos: Vec;
	size: Vec;

	constructor(name: string, pos: Vec, size: Vec) {
		this.name = name;
		this.pos = Vec.clone(pos);
		this.size = Vec.clone(size);
	}
}