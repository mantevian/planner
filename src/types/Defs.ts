import Color from "./Color";
import PlanDocElement from "./PlanDocElement";
import Template from "./Template";

export default class Defs implements PlanDocElement {
	readonly _name = "defs";

	color?: Color[];
	template?: Template[];
}