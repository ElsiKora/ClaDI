/**
 * Check if an object contains any functions in its property tree
 * @param {unknown} object Object to check
 * @returns {boolean} True if the object contains functions, false otherwise
 */
export function hasFunctions(object: unknown): boolean {
	if (object == null || typeof object !== "object") {
		return typeof object === "function";
	}

	if (Array.isArray(object)) {
		return object.some((item: unknown) => hasFunctions(item));
	}

	for (const key in object) {
		if (Object.prototype.hasOwnProperty.call(object, key)) {
			const value: unknown = (object as Record<string, unknown>)[key];

			if (typeof value === "function") {
				return true;
			}

			if (value != null && typeof value === "object" && hasFunctions(value)) {
				return true;
			}
		}
	}

	return object.constructor === Object ? false : true;
}
