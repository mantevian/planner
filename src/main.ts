import { PlannerOptions, render } from "./render";

main();

async function main() {
	const res = await fetch("./input.xml");
	const text = await res.text();

	const viewFlatIdInput: HTMLInputElement = document.querySelector("input[name='view-flat-id']")!;
	const planInputElement: HTMLTextAreaElement = document.querySelector("textarea")!;
	planInputElement.textContent = text;

	let options: PlannerOptions = { input: text };

	updateOutput(options);

	planInputElement.addEventListener("input", async () => {
		options.input = planInputElement.value ?? "";
		updateOutput(options);
	});

	viewFlatIdInput.addEventListener("input", async () => {
		const id = viewFlatIdInput.value;
		options.viewFlatId = id;
		updateOutput(options);
	});
}

function updateOutput(options: PlannerOptions) {
	render(options).then(ctx => {
		document.querySelector("#output")!.replaceChildren(ctx.svg);
		document.querySelector("#output-errors")!.innerHTML = ctx.errors.filter(e => ctx.showErrorTypes.includes(e.level)).map(e => `
				<p data-plan-error-level="${e.level}">[${e.level}] ${e.message}</p>
			`).join("");
	});
}
