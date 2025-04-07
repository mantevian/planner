import Vec from "./Vec";

export default class Use {
	name: string;
	pos: Vec;
	size: Vec;

	constructor(name: string, pos: Vec, size: Vec) {
		this.name = name;
		this.pos = Vec.clone(pos);
		this.size = Vec.clone(size);
	}
}