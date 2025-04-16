import { hasFunctions } from "./has-functions.utility";

/**
 * Utility method to safely deep clone objects that may contain functions.
 * Uses a hybrid approach with structuredClone for data objects and custom cloning for objects with functions.
 * @param {T} source Object to clone
 * @returns {T} A deep clone of the object
 * @template T Type of object to clone
 * @see {@link https://elsikora.com/docs/cladi/utility/safe-deep-clone}
 */
export function safeDeepClone<T>(source: T): T {
	if (source == null || typeof source !== "object") {
		return source;
	}

	if (source instanceof Date) {
		return new Date(source) as unknown as T;
	}

	if (Array.isArray(source)) {
		return source.map((item: unknown) => safeDeepClone(item)) as unknown as T;
	}

	if (!hasFunctions(source) && source.constructor === Object) {
		try {
			// eslint-disable-next-line @elsikora/node/no-unsupported-features/node-builtins
			return structuredClone(source) as T;
		} catch {
			// Fall back to manual cloning if structuredClone fails
		}
	}

	if (source.constructor !== Object) {
		const prototype: null | object = Object.getPrototypeOf(source) as null | object;
		const result: unknown = Object.create(prototype);

		for (const key of Object.getOwnPropertyNames(source)) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(source, key);

			if (descriptor) {
				if (descriptor.value !== undefined) {
					// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
					descriptor.value = safeDeepClone(descriptor.value);
				}

				Object.defineProperty(result, key, descriptor);
			}
		}

		return result as T;
	}

	const result: Record<string, unknown> = {};

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			result[key] = safeDeepClone((source as Record<string, unknown>)[key]);
		}
	}

	return result as T;
}
