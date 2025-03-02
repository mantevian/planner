import Use from "./Use";
import Vec from "./Vec";
import Wall from "./Wall";

export default class Space {
	contour: Vec[];
	wall: Wall[];
	space: Space[];
	use: Use[];

	constructor() {
		this.contour = [];
		this.wall = [];
		this.space = [];
		this.use = [];
	}
}