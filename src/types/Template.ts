import PlanDocElement from "./PlanDocElement";

export default class Template implements PlanDocElement {
	readonly _name = "template";

	name: string;

	constructor(name: string) {
		this.name = name;
	}
}