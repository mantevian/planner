import { PlanContext } from "../render";
import PlanDocElement from "../types/PlanDocElement";

export default function reverseAxes({ ctx: planContext, invertX, invertY }: {
	ctx: PlanContext,
	invertX: boolean,
	invertY: boolean
}) {
	const result = structuredClone(planContext.plan);

	const ctx: InvertAxesCtx = {
		x: [...planContext.axes.x.keys()],
		y: [...planContext.axes.y.keys()],
		invertX,
		invertY
	}

	parseElement(result, ctx);

	console.log(result);

	return result;
}

type InvertAxesCtx = {
	x: string[];
	y: string[];
	invertX: boolean;
	invertY: boolean;
};

function reverse(axis: string, ctx: InvertAxesCtx): string {
	const xi = ctx.x.findIndex(a => a == axis);
	const yi = ctx.y.findIndex(a => a == axis);

	if (ctx.invertX && xi > -1) {
		return ctx.x[ctx.x.length - xi - 1];
	}

	if (ctx.invertY && yi > -1) {
		return ctx.y[ctx.y.length - yi - 1];
	}

	return axis;
}

function parseElement(el: PlanDocElement, ctx: InvertAxesCtx) {
	if (typeof el != "object") {
		return;
	}

	const attrs = Object.entries(el);

	for (const [k, v] of attrs) {
		if (typeof v == "string") {
			if (k == "wall") {
				const axes = v.split(/[\,\s]/).filter(Boolean);
				(el as any)["wall"] = `${reverse(axes[0], ctx)} ${reverse(axes[1], ctx)}, ${reverse(axes[2], ctx)} ${reverse(axes[3], ctx)}`;
			}

			if (k == "from" || k == "to") {
				const axes = v.split(/[\,\s]/).filter(Boolean);
				(el as any)[k] = `${reverse(axes[0], ctx)} ${reverse(axes[1], ctx)}`;
			}
		}

		parseElement(v, ctx);
	}
}