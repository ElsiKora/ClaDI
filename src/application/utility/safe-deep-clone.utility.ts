type TBufferApi = {
	from: (value: ArrayLike<number>) => Uint8Array;
	isBuffer: (value: unknown) => boolean;
};

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
 * Clones DataView and typed array instances.
 * @param {ArrayBufferView} source Typed array or DataView to clone.
 * @returns {ArrayBufferView} Cloned buffer view.
 */
function cloneArrayBufferView(source: ArrayBufferView): ArrayBufferView {
	if (source instanceof DataView) {
		const clonedDataViewBuffer: ArrayBufferLike = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);

		return new DataView(clonedDataViewBuffer);
	}

	type TTypedArrayConstructor = new (source: ArrayLike<bigint> | ArrayLike<number>) => ArrayBufferView;
	const typedArrayConstructor: TTypedArrayConstructor = source.constructor as TTypedArrayConstructor;

	return new typedArrayConstructor(source as unknown as ArrayLike<bigint> | ArrayLike<number>);
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

	if (source instanceof ArrayBuffer) {
		const clonedArrayBuffer: ArrayBuffer = Uint8Array.from(new Uint8Array(source)).buffer;
		references.set(sourceObject, clonedArrayBuffer);

		return clonedArrayBuffer as unknown as T;
	}

	if (isSharedArrayBuffer(source)) {
		const clonedSharedArrayBuffer: SharedArrayBuffer = new SharedArrayBuffer(source.byteLength);
		new Uint8Array(clonedSharedArrayBuffer).set(new Uint8Array(source));
		references.set(sourceObject, clonedSharedArrayBuffer);

		return clonedSharedArrayBuffer as unknown as T;
	}

	const bufferApi: TBufferApi | undefined = getBufferApi();

	if (bufferApi?.isBuffer(source)) {
		const clonedBuffer: Uint8Array = bufferApi.from(source as unknown as ArrayLike<number>);
		references.set(sourceObject, clonedBuffer);

		return clonedBuffer as unknown as T;
	}

	if (ArrayBuffer.isView(source)) {
		const clonedArrayBufferView: ArrayBufferView = cloneArrayBufferView(source);
		references.set(sourceObject, clonedArrayBufferView);

		return clonedArrayBufferView as unknown as T;
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

/**
 * Returns Buffer API when running in Node.js.
 * @returns {TBufferApi | undefined} Node Buffer helpers or undefined.
 */
function getBufferApi(): TBufferApi | undefined {
	const globalWithBuffer: { Buffer?: TBufferApi } = globalThis as { Buffer?: TBufferApi };

	return globalWithBuffer.Buffer;
}

/**
 * Checks whether value is a SharedArrayBuffer instance.
 * @param {unknown} value Value to inspect.
 * @returns {value is SharedArrayBuffer} True when value is SharedArrayBuffer.
 */
function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
	return typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}
