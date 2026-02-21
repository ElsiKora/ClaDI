/**
 * Utility method to safely deep clone objects that may contain functions.
 * Unlike structuredClone, this can handle functions by preserving their reference
 * but cloning everything else.
 * @param {T} source Object to clone
 * @returns {T} A deep clone of the object
 * @template T Type of object to clone
 */
export function safeDeepClone<T>(source: T): T {
	return cloneRecursive(source, new WeakMap<object, unknown>());
}

/**
 * Recursively clones values while preserving circular references.
 * @param {T} source Source value to clone.
 * @param {WeakMap<object, unknown>} references Previously cloned references.
 * @returns {T} Cloned value.
 */
function cloneRecursive<T>(source: T, references: WeakMap<object, unknown>): T {
	if (source == null || typeof source !== "object") {
		return source;
	}

	const sourceObject: object = source as object;
	const cachedClone: unknown = references.get(sourceObject);

	if (cachedClone !== undefined) {
		return cachedClone as T;
	}

	if (source instanceof Date) {
		return new Date(source) as unknown as T;
	}

	if (source instanceof RegExp) {
		return new RegExp(source.source, source.flags) as unknown as T;
	}

	if (Array.isArray(source)) {
		const clonedArray: Array<unknown> = [];
		references.set(sourceObject, clonedArray);

		for (const item of source) {
			clonedArray.push(cloneRecursive(item, references));
		}

		return clonedArray as unknown as T;
	}

	if (source instanceof Map) {
		const clonedMap: Map<unknown, unknown> = new Map<unknown, unknown>();
		references.set(sourceObject, clonedMap);

		for (const [key, value] of source.entries()) {
			clonedMap.set(cloneRecursive(key, references), cloneRecursive(value, references));
		}

		return clonedMap as unknown as T;
	}

	if (source instanceof Set) {
		const clonedSet: Set<unknown> = new Set<unknown>();
		references.set(sourceObject, clonedSet);

		for (const value of source.values()) {
			clonedSet.add(cloneRecursive(value, references));
		}

		return clonedSet as unknown as T;
	}

	const prototype: null | object = Object.getPrototypeOf(sourceObject) as null | object;
	const clonedObject: Record<PropertyKey, unknown> = Object.create(prototype) as Record<PropertyKey, unknown>;
	references.set(sourceObject, clonedObject);

	for (const key of Reflect.ownKeys(sourceObject)) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(sourceObject, key);

		if (!descriptor) {
			continue;
		}

		if ("value" in descriptor) {
			const clonedValue: unknown = cloneRecursive(descriptor.value as unknown, references);
			Object.defineProperty(clonedObject, key, { ...descriptor, value: clonedValue });
			continue;
		}

		Object.defineProperty(clonedObject, key, descriptor);
	}

	return clonedObject as T;
}
