import Color from "./Color";
import Template from "./Template";

export default class Defs {
	color: Color[];
	template: Template[];

	constructor() {
		this.color = [];
		this.template = [];
	}
}