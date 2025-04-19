import PlanDocElement from "./PlanDocElement";

export default class Color implements PlanDocElement {
	readonly _name = "color";

	name: string;
	value: string;

	constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}
}