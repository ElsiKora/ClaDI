import { hasFunctions } from "@application/utility";
import { describe, expect, it } from "vitest";

describe("hasFunctions", () => {
	it("should return false for null or undefined", () => {
		expect(hasFunctions(null)).toBe(false);
		expect(hasFunctions()).toBe(false);
	});

	it("should return false for primitives", () => {
		expect(hasFunctions(123)).toBe(false);
		expect(hasFunctions("string")).toBe(false);
		expect(hasFunctions(true)).toBe(false);
		expect(hasFunctions(Symbol("sym"))).toBe(false);
		expect(hasFunctions(BigInt(10))).toBe(false);
	});

	it("should return true for a direct function", () => {
		const function_ = (): void => {};
		expect(hasFunctions(function_)).toBe(true);
	});

	it("should return false for plain objects without functions", () => {
		const object = { a: 1, b: "test", c: { d: true } };
		expect(hasFunctions(object)).toBe(false);
	});

	it("should return true for plain objects with top-level functions", () => {
		const object = { a: 1, b: () => {} };
		expect(hasFunctions(object)).toBe(true);
	});

	it("should return true for plain objects with nested functions", () => {
		const object = { a: 1, b: { c: () => {} } };
		expect(hasFunctions(object)).toBe(true);
	});

	it("should return false for arrays without functions", () => {
		const array = [1, "test", { a: true }, [2]];
		expect(hasFunctions(array)).toBe(false);
	});

	it("should return true for arrays with direct functions", () => {
		const array = [1, () => {}, { a: true }];
		expect(hasFunctions(array)).toBe(true);
	});

	it("should return true for arrays with nested functions (in objects)", () => {
		const array = [1, { a: () => {} }];
		expect(hasFunctions(array)).toBe(true);
	});

	it("should return true for arrays with nested functions (in arrays)", () => {
		const array = [1, [2, () => {}]];
		expect(hasFunctions(array)).toBe(true);
	});

	it("should return true for objects with prototypes (e.g., class instances) even without own functions", () => {
		class MyClass {
			a = 1;
		}
		const instance = new MyClass();
		expect(hasFunctions(instance)).toBe(true);
	});

	it("should return true for objects with prototypes containing functions", () => {
		class MyClassWithMethod {
			myMethod(): void {}
		}
		const instance = new MyClassWithMethod();
		expect(hasFunctions(instance)).toBe(true);
	});

	it("should handle complex nested structures", () => {
		const complex = {
			a: [1, { b: "test" }],
			c: { d: [true, { e: 5 }] },
		};
		expect(hasFunctions(complex)).toBe(false);

		const complexWithFunction = {
			a: [1, { b: () => {} }],
			c: { d: [true, { e: 5 }] },
		};
		expect(hasFunctions(complexWithFunction)).toBe(true);
	});
});
