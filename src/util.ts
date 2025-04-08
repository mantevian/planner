import Vec from "./types/Vec";

const Util = {
	d(action: string, p: Vec): string {
		return ` ${action} ${p.x},${p.y}`;
	},

	polyline(points: Vec[]): string {
		let path = this.d("M", points[0]);

		for (let i = 1; i < points.length; i++) {
			path += this.d(points[i].action == "line" ? "L" : "M", points[i]);
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
		}: {
			name: K,
			id?: string,
			classes?: string[],
			attributes?: Record<string, string>,
			parent?: Element,
			innerHTML?: string;
		}): SVGElementTagNameMap[K] {
		const element = document.createElementNS("http://www.w3.org/2000/svg", name);

		if (id) {
			element.id = id;
		}

		if (classes.length > 0) {
			element.classList.add(...classes);
		}

		for (const [key, value] of Object.entries(attributes)) {
			element.setAttribute(key, value);
		}

		if (parent) {
			parent.appendChild(element);
		}

		if (innerHTML) {
			element.innerHTML = innerHTML;
		}

		return element;
	},

	round(n: number): number {
		return Math.floor(n * 1000) / 1000;
	}
};

export default Util;