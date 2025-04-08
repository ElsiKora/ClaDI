/**
 * Utility method to safely deep clone objects that may contain functions.
 * Unlike structuredClone, this can handle functions by preserving their reference
 * but cloning everything else.
 * @param {T} source Object to clone
 * @returns {T} A deep clone of the object
 * @template T Type of object to clone
 */
export function safeDeepClone<T>(source: T): T {
	// Return primitive values and functions directly
	if (source == null || typeof source !== "object") {
		return source;
	}

	// Handle Date
	if (source instanceof Date) {
		return new Date(source) as unknown as T;
	}

	// Handle Array
	if (Array.isArray(source)) {
		return source.map((item: unknown) => safeDeepClone(item)) as unknown as T;
	}

	// Handle Object
	const result: Record<string, unknown> = {};

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			result[key] = safeDeepClone((source as Record<string, unknown>)[key]);
		}
	}

	return result as T;
}
