import Vec from "./Vec";

export default class Use {
	name: string;
	pos: Vec;
	size: Vec;
	rotate: number;

	constructor(name: string, pos: Vec, size: Vec, rotate: number) {
		this.name = name;
		this.pos = Vec.clone(pos);
		this.size = Vec.clone(size);
		this.rotate = rotate;
	}
}