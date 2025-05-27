import PlanDocElement from "./PlanDocElement";

export default class Template implements PlanDocElement {
	readonly _name = "template";

	name: string = "";
	path: string = "";
	no_rotate?: any = null;
}
