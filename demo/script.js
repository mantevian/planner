window.addEventListener("load", () => {
	insertPlan("plan", document.querySelector("section.chooser .plan"));
});

function insertPlan(name, container) {
	fetch(`./plans/${name}.svg`).then(res => {
		res.text().then(text => {
			container.innerHTML = text;

			if (container.closest("section.chooser")) {
				initTooltip();
			}
		});
	});
}

function initTooltip() {
	const tooltip = document.querySelector("div.tooltip");

	const card = document.querySelector("section.apartment-card");
	const chooser = document.querySelector("section.chooser");

	chooser.querySelectorAll("g.flat:not(#flat-999)").forEach(flat => {
		const n = flat.id.replace("flat-", "");

		flat.addEventListener("mousemove", e => {
			tooltip.style.left = `${e.x}px`;
			tooltip.style.top = `${e.y}px`;
		});

		flat.addEventListener("mouseenter", () => {
			tooltip.classList.remove("hide");

			const area = [...flat.querySelectorAll("text.area")].map(text => parseFloat(text.innerHTML)).reduce((a, b) => a + b);

			tooltip.querySelector("[data-param='flat-area']").innerHTML = area;
			tooltip.querySelector("[data-param='flat-number']").innerHTML = n;
		});

		flat.addEventListener("mouseleave", () => {
			tooltip.classList.add("hide");
		});

		flat.addEventListener("click", () => {
			chooser.classList.add("hide");
			card.classList.remove("hide");

			insertPlan(`plan_${n}`, card.querySelector(".plan"));

			card.querySelector("[data-param='flat-number']").innerHTML = n;
		});
	});

	card.querySelector("button").addEventListener("click", () => {
		chooser.classList.remove("hide");
		card.classList.add("hide");
	});
}