import { describe, expect, it, vi } from "vitest";
import { safeDeepClone } from "@application/utility";

class ExampleEntity {
	constructor(private readonly id: number) {}

	public getLabel(): string {
		return `entity-${String(this.id)}`;
	}
}

describe("safeDeepClone", () => {
	it("preserves circular references", () => {
		const source: { name: string; nested: { parent?: unknown }; self?: unknown } = {
			name: "root",
			nested: {},
		};
		source.self = source;
		source.nested.parent = source;

		const cloned = safeDeepClone(source);

		expect(cloned).not.toBe(source);
		expect(cloned.self).toBe(cloned);
		expect(cloned.nested.parent).toBe(cloned);
	});

	it("clones Date, RegExp, Map and Set values", () => {
		const date = new Date("2026-01-01T00:00:00.000Z");
		const regex = /cladi/gi;
		const key = { key: "map-key" };
		const value = { value: "map-value" };
		const setValue = { set: "value" };
		const source = {
			date,
			map: new Map<unknown, unknown>([[key, value]]),
			regex,
			set: new Set<unknown>([setValue]),
		};

		const cloned = safeDeepClone(source);
		const [[clonedMapKey, clonedMapValue]] = [...cloned.map.entries()];
		const [clonedSetValue] = [...cloned.set.values()];

		expect(cloned.date).not.toBe(date);
		expect(cloned.date.getTime()).toBe(date.getTime());
		expect(cloned.regex).not.toBe(regex);
		expect(cloned.regex.source).toBe(regex.source);
		expect(cloned.regex.flags).toBe(regex.flags);
		expect(clonedMapKey).toEqual(key);
		expect(clonedMapKey).not.toBe(key);
		expect(clonedMapValue).toEqual(value);
		expect(clonedMapValue).not.toBe(value);
		expect(clonedSetValue).toEqual(setValue);
		expect(clonedSetValue).not.toBe(setValue);
	});

	it("preserves prototype chain for class instances", () => {
		const source = {
			entity: new ExampleEntity(7),
		};

		const cloned = safeDeepClone(source);

		expect(cloned.entity).not.toBe(source.entity);
		expect(Object.getPrototypeOf(cloned.entity)).toBe(ExampleEntity.prototype);
		expect(cloned.entity.getLabel()).toBe("entity-7");
	});

	it("preserves accessor descriptors (getters/setters)", () => {
		let backingValue = 10;
		const source: Record<string, unknown> = {};
		Object.defineProperty(source, "value", {
			configurable: true,
			enumerable: true,
			get: () => backingValue,
			set: (nextValue: number) => {
				backingValue = nextValue;
			},
		});

		const cloned = safeDeepClone(source);
		const sourceDescriptor = Object.getOwnPropertyDescriptor(source, "value");
		const clonedDescriptor = Object.getOwnPropertyDescriptor(cloned, "value");

		expect(clonedDescriptor?.get).toBe(sourceDescriptor?.get);
		expect(clonedDescriptor?.set).toBe(sourceDescriptor?.set);
		(cloned as { value: number }).value = 42;
		expect((cloned as { value: number }).value).toBe(42);
	});

	it("keeps function references intact", () => {
		const formatter = vi.fn((value: string) => value.toUpperCase());
		const source = {
			formatter,
			nested: { formatter },
		};

		const cloned = safeDeepClone(source);

		expect(cloned.formatter).toBe(formatter);
		expect(cloned.nested.formatter).toBe(formatter);
		expect(cloned.formatter("ok")).toBe("OK");
	});

	it("clones ArrayBuffer and typed array values", () => {
		const arrayBuffer = new ArrayBuffer(4);
		const typedArray = new Uint8Array(arrayBuffer);
		typedArray.set([1, 2, 3, 4]);
		const source = {
			arrayBuffer,
			typedArray,
		};

		const cloned = safeDeepClone(source);

		expect(cloned.arrayBuffer).not.toBe(arrayBuffer);
		expect(new Uint8Array(cloned.arrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 4]));
		expect(cloned.typedArray).not.toBe(typedArray);
		expect(cloned.typedArray).toEqual(new Uint8Array([1, 2, 3, 4]));
		cloned.typedArray[0] = 99;
		expect(typedArray[0]).toBe(1);
	});

	it("clones Buffer values when Buffer is available", () => {
		const globalWithBuffer = globalThis as {
			Buffer?: {
				from: (value: string) => Uint8Array;
			};
		};
		const bufferApi = globalWithBuffer.Buffer;

		if (!bufferApi) {
			return;
		}

		const sourceBuffer = bufferApi.from("cladi");
		const source = { sourceBuffer };
		const cloned = safeDeepClone(source);

		expect(cloned.sourceBuffer).not.toBe(sourceBuffer);
		expect(cloned.sourceBuffer).toEqual(sourceBuffer);
	});
});
