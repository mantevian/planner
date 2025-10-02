import createPanZoom from "panzoom";
import { PlannerOptions, render } from "./render";
import reverseWalls from "./meta/reverseWalls";
import Util from "./util";
import { objToXML } from "./xml";

const fileNumber = "10";

main();

async function main() {
	const input = await (await fetch(`./input${fileNumber}.xml`)).text();
	const xsd = await (await fetch("./planner.xsd")).text();

	const viewFlatIdInput: HTMLInputElement = document.querySelector("input[name='view-flat-id']")!;
	const debugModeInput: HTMLInputElement = document.querySelector("input[name='debug-mode']")!;
	const planInputElement: HTMLTextAreaElement = document.querySelector("textarea")!;
	const output = document.querySelector("#output")!;
	planInputElement.textContent = input;

	let options: PlannerOptions = {
		input: input,
		debug: {
			showAxes: debugModeInput.checked,
			axesButtons: true,
		},
		showErrorLevels: ["note", "warn", "error"],
		xsd: xsd,
		mmPerPx: 10,
		fractionDigits: 2,
		useSvgUseElement: false
	};

	updateOutput(options);

	planInputElement.addEventListener("input", () => {
		options.input = planInputElement.value ?? "";
		updateOutput(options);
	});

	viewFlatIdInput.addEventListener("input", () => {
		const id = viewFlatIdInput.value;
		options.viewFlatId = id;
		updateOutput(options);
	});

	debugModeInput.addEventListener("input", () => {
		options.debug.showAxes = debugModeInput.checked;
		updateOutput(options);
	});

	document.querySelector("#download-full")?.addEventListener("click", () => {
		downloadFile("plan.svg", output.querySelector("svg")!.outerHTML);
	});

	document.querySelector("#download-current")?.addEventListener("click", () => {
		downloadFile(`plan_${options.viewFlatId!}.svg`, output.querySelector("svg")!.outerHTML);
	});

	document.querySelector("#invert-room-walls")?.addEventListener("click", () => {
		const input: HTMLInputElement = document.querySelector("input[name='invert-room-walls']")!;
		console.log(reverseWalls(input.value));
	});
}

function updateOutput(options: PlannerOptions) {
	const output: HTMLElement = document.querySelector("#output")!;

	render(options).then(ctx => {
		const ref = document.createElement("img");
		ref.src = `ref${fileNumber}.svg`;
		ref.id = `ref${fileNumber}`;
		ref.classList.add("ref");

		output.replaceChildren(ctx.svg, ref);

		const svg = output.querySelector("svg")!;

		createPanZoom(output, {
			bounds: true,
			boundsPadding: 0
		});

		const points: string[] = [];

		output.querySelectorAll(".axes-intersection-button").forEach(button => {
			button.addEventListener("click", () => {
				points.push(`${button.getAttribute("data-idx")} ${button.getAttribute("data-idy")}`);
				console.log(button.getAttribute("data-idx"), button.getAttribute("data-idy"));
				console.log(objToXML(Util.makeWallPath(points), 1).outerHTML);
			});
		});

		function svgPointFromMouse(element: SVGElement, e: MouseEvent) {
			const svg = element.ownerSVGElement || (element.nodeName === 'svg' ? element : null) as (SVGSVGElement | null);
			if (!svg) throw new Error('SVG root not found');

			const pt = svg.createSVGPoint();
			pt.x = e.clientX;
			pt.y = e.clientY;

			const ctm = svg.getScreenCTM();
			if (!ctm) return null;

			const inverseCTM = ctm.inverse();
			const svgP = pt.matrixTransform(inverseCTM);

			const vb = svg.getAttribute('viewBox');
			const viewBoxHeight = vb ? Number(vb.split(/\s+/)[3]) : svg.viewBox.baseVal.height;

			return { x: (svgP.x) * ctx.options.mmPerPx, y: (viewBoxHeight - svgP.y - ctx.viewPadding * 2) * ctx.options.mmPerPx };
		}

		svg.addEventListener("click", e => {
			console.log(svgPointFromMouse(svg, e));
		});

		document.querySelector("#output-errors")!.innerHTML = ctx.errors.filter(e => options.showErrorLevels.includes(e.level)).map(e => `
				<p data-plan-error-level="${e.level}">[${e.level}] ${e.message}</p>
			`).join("");
		document.querySelector("label:has(input[name='menu-tab'][value='debug']")?.setAttribute("data-error-count", ctx.errors.length.toString());

		if (options.viewFlatId) {
			document.querySelector("#download-current")?.removeAttribute("disabled");
			document.querySelector("#download-full")?.setAttribute("disabled", "");
		} else {
			document.querySelector("#download-current")?.setAttribute("disabled", "");
			document.querySelector("#download-full")?.removeAttribute("disabled");
		}
	});
}

function downloadFile(name: string, content: string) {
	const blob = new Blob([content], { type: 'text/plain' });
	const a = document.createElement('a');
	a.download = name;
	a.href = window.URL.createObjectURL(blob);
	a.click();
}
