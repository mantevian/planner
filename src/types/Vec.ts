import Util from "../util";

export default class Vec {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = Util.round(x);
		this.y = Util.round(y);
	}

	static clone(vec: Vec): Vec {
		return new Vec(vec.x, vec.y);
	}

	static plus(v1: Vec, v2: Vec): Vec {
		return new Vec(v1.x + v2.x, v1.y + v2.y);
	}

	static mul(v: Vec, n: number): Vec {
		return new Vec(v.x * n, v.y * n);
	}

	static dot(v1: Vec, v2: Vec): number {
		return v1.x * v2.x + v1.y * v2.y;
	}

	static cross(v1: Vec, v2: Vec): number {
		return v1.x * v2.y - v1.y * v2.x;
	}

	static angle(v1: Vec, v2: Vec): number {
		let angle = Math.atan2(this.cross(v1, v2), this.dot(v1, v2));

		if (angle < 0) {
			angle += 2 * Math.PI;
		}

		return angle;
	}

	static zero(): Vec {
		return new Vec(0, 0);
	}

	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalized(): Vec {
		const len = this.length();
		return new Vec(this.x / len, this.y / len);
	}
}