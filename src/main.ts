import createPanZoom from "panzoom";
import { PlannerOptions, render } from "./render";

main();

async function main() {
	const input = await (await fetch("./input.xml")).text();
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
		fractionDigits: 2
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
		downloadFile("plan.svg", output.innerHTML);
	});

	document.querySelector("#download-current")?.addEventListener("click", () => {
		downloadFile(`plan_${options.viewFlatId!}.svg`, output.innerHTML);
	});
}

function updateOutput(options: PlannerOptions) {
	const output: HTMLElement = document.querySelector("#output")!;

	render(options).then(ctx => {
		output.replaceChildren(ctx.svg);

		createPanZoom(output, {
			bounds: true,
			boundsPadding: 0
		});

		output.querySelectorAll(".axes-intersection-button").forEach(button => {
			button.addEventListener("click", () => {
				console.log(button.getAttribute("data-idx"), button.getAttribute("data-idy"));
			});
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
