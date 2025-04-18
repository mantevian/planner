export default function parseElement(element: Element) {
	let result: any = {};

	if (element.tagName.toLowerCase() != "point") {
		parseCoordinatesToVec(element, "pos", "x", "y", result);
		parseCoordinatesToVec(element, "size", "w", "h", result);
	}

	for (const attr of element.getAttributeNames()) {
		const value = element.getAttribute(attr) ?? "";
		const isNumber = isNum(value);

		if (attr == "id") {
			result[attr] = value;
			continue;
		}

		if (isNumber) {
			console.log(value, parseNumberUnit(value));
			result[attr] = parseNumberUnit(value);
		} else {
			result[attr] = value;
		}
	}

	for (const child of element.childNodes) {
		switch (child.nodeType) {
			case 1:
				const name = (child as Element).tagName.toLowerCase();

				if (!result[name]) {
					result[name] = [];
				}

				result[name].push(parseElement(child as Element));
				break;

			case 3:
				const text = (child as Text).wholeText.trim();

				if (text) {
					result["_"] = text;
				}

				break;
		}
	}

	return result;
}

function parseCoordinatesToVec(element: Element, attrName: string, xName: string, yName: string, result: any) {
	if (element.hasAttribute(xName) && element.hasAttribute(yName)) {
		result[attrName] = {
			x: parseNumberUnit(element.getAttribute(xName) ?? "0"),
			y: parseNumberUnit(element.getAttribute(yName) ?? "0")
		};
	}
}

/** match a string that is exactly of structure `<num><unit>?`, where `<num>` is any float decimal number and optional `<unit>` is one of `mm`, `cm`, `dm`, `m`
 * 
 * for example `1234`, `1234mm`, `123cm`, `12dm`, `1.2m` */
const regex = /^(?<num>[\d.]+)(?<unit>(mm)|(cm)|(dm)|(m))?$/;

type MeasureUnit = "mm" | "cm" | "dm" | "m";

function isNum(input: string): boolean {
	const match = input.match(regex);

	return match != null && match.groups != null;
}

function parseNumberUnit(input: string): number | null {
	const match = input.match(regex);

	if (!match || !match.groups) {
		return null;
	}

	const num = match.groups.num;
	const unit = (match.groups.unit ?? "mm") as MeasureUnit;

	const n = Number(num);
	const units = {
		mm: 1,
		cm: 10,
		dm: 100,
		m: 1000
	};

	return n * units[unit];
}