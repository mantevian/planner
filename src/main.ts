import { PlannerOptions, render } from "./render";

main();

async function main() {
	const res = await fetch("./input.xml");
	const text = await res.text();

	const viewFlatIdInput: HTMLInputElement = document.querySelector("input[name='view-flat-id']")!;
	const debugModeInput: HTMLInputElement = document.querySelector("input[name='debug-mode']")!;
	const planInputElement: HTMLTextAreaElement = document.querySelector("textarea")!;
	const output = document.querySelector("#output")!;
	planInputElement.textContent = text;

	let options: PlannerOptions = {
		input: text,
		debugMode: debugModeInput.checked,
		showErrorLevels: ["note", "warn", "error"]
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
		options.debugMode = debugModeInput.checked;
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
	render(options).then(ctx => {
		document.querySelector("#output")!.replaceChildren(ctx.svg);
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
