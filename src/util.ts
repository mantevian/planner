import Vec from "./types/Vec";

const Util = {
	d(action: string, p: Vec): string {
		return ` ${action} ${p.x},${p.y}`;
	},

	polyline(points: Vec[]): string {
		let path = this.d("M", points[0]);

		for (let i = 1; i < points.length; i++) {
			path += this.d("L", points[i]);
		}

		return path;
	},

	create<K extends keyof SVGElementTagNameMap>(
		{
			name,
			id = "",
			classes = [],
			attributes = {},
			parent,
			innerHTML,
			children
		}: {
			name: K,
			id?: string,
			classes?: string[],
			attributes?: Record<string, string | number | boolean>,
			parent?: Element,
			innerHTML?: string,
			children?: Element[];
		}): SVGElementTagNameMap[K] {
		const element = document.createElementNS("http://www.w3.org/2000/svg", name);

		if (id) {
			element.id = id;
		}

		if (classes.length > 0) {
			element.classList.add(...classes);
		}

		for (const [key, value] of Object.entries(attributes)) {
			element.setAttribute(key, value.toString());
		}

		if (parent) {
			parent.appendChild(element);
		}

		if (innerHTML) {
			element.innerHTML = innerHTML;
		}

		if (children) {
			children.forEach(child => {
				element.appendChild(child);
			});
		}

		return element;
	},

	round(n: number, precision: number = 3): number {
		const e = Math.pow(10, precision);
		return Math.floor(n * e) / e;
	},

	/** https://stackoverflow.com/questions/13937782/calculating-the-point-of-intersection-of-two-lines */
	intersectionABandCD(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
		const x1 = a.x, y1 = a.y;
		const x2 = b.x, y2 = b.y;
		const x3 = c.x, y3 = c.y;
		const x4 = d.x, y4 = d.y;

		const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

		if (denominator == 0) {
			return null;
		}

		const t = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;

		const x = x1 + t * (x2 - x1);
		const y = y1 + t * (y2 - y1);

		return new Vec(x, y);
	},

	/** https://www.npmjs.com/package/point-in-polygon */
	isPointInPolygon(point: Vec, polygon: Vec[]): boolean {
		const x = point.x;
		const y = point.y;
		const start = 0;
		const end = polygon.length;
		const len = end - start;

		let inside = false;

		for (let i = 0, j = len - 1; i < len; j = i++) {
			const xi = polygon[i + start].x;
			const yi = polygon[i + start].y;
			const xj = polygon[j + start].x;
			const yj = polygon[j + start].y;

			const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
			if (intersect) {
				inside = !inside;
			}
		}

		return inside;
	},

	/** https://stackoverflow.com/questions/16285134/calculating-polygon-area/ */
	polygonArea(polygon: Vec[]): number {
		let total = 0;

		const len = polygon.length;

		for (let i = 0; i < len; i++) {
			const addX = polygon[i].x;
			const addY = polygon[i == polygon.length - 1 ? 0 : i + 1].y;
			const subX = polygon[i == polygon.length - 1 ? 0 : i + 1].x;
			const subY = polygon[i].y;

			total += (addX * addY * 0.5);
			total -= (subX * subY * 0.5);
		}

		return Math.abs(total);
	},

	polygonCenter(polygon: Vec[]): Vec {
		const result = new Vec(0, 0);

		for (const p of polygon) {
			result.x += p.x;
			result.y += p.y;
		}

		result.x /= polygon.length;
		result.y /= polygon.length;

		return result;
	},

	getWrapped<T>(array: T[], index: number): T {
		const length = array.length;
		let wrappedIndex = index % length;

		if (wrappedIndex < 0) {
			wrappedIndex += length;
		}

		return array[wrappedIndex];
	}
};

export default Util;