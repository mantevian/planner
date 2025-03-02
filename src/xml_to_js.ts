export default function parseElement(element: Element) {
	let result: any = {};

	if (element.tagName.toLowerCase() != "point") {
		parseCoordinatesToVec(element, "pos", "x", "y", result);
		parseCoordinatesToVec(element, "size", "w", "h", result);
	}

	for (const attr of element.getAttributeNames()) {
		const value = element.getAttribute(attr) ?? "";
		const isFloat = !isNaN(parseFloat(value));

		if (isFloat) {
			result[attr] = parseFloat(value);
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
			x: parseFloat(element.getAttribute(xName) ?? "0"),
			y: parseFloat(element.getAttribute(yName) ?? "0")
		};
	}
}