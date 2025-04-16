import { safeDeepClone } from "@application/utility";
import { describe, expect, it } from "vitest";

describe("safeDeepClone", () => {
	it("should return primitives unchanged", () => {
		expect(safeDeepClone(123)).toBe(123);
		expect(safeDeepClone("hello")).toBe("hello");
		expect(safeDeepClone(true)).toBe(true);
		expect(safeDeepClone(null)).toBeNull();
		expect(safeDeepClone()).toBeUndefined();
		const sym = Symbol("a");
		expect(safeDeepClone(sym)).toBe(sym);
	});

	it("should deep clone plain objects", () => {
		const original = { a: 1, b: { c: 2 }, d: [3, 4] };
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone.b).not.toBe(original.b);
		expect(clone.d).not.toBe(original.d);
	});

	it("should deep clone arrays", () => {
		const original = [1, { a: 2 }, [3, 4]];
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone[1] as Record<string, unknown>).not.toBe(original[1]);
		expect(clone[2] as Array<number>).not.toBe(original[2]);
	});

	it("should clone Dates correctly", () => {
		const original = new Date();
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone instanceof Date).toBe(true);
	});

	it("should deep clone objects with functions", () => {
		const function_ = (): string => "test";
		const original = { a: 1, b: function_, c: { d: function_ } };
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone.b).toBe(original.b); // Functions should be copied by reference
		expect(clone.c).not.toBe(original.c);
		expect(clone.c.d).toBe(original.c.d); // Functions should be copied by reference
	});

	it("should deep clone arrays with functions", () => {
		const function_ = (): string => "test";
		const original = [1, function_, { a: function_ }];
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone[1]).toBe(original[1]); // Functions copied by reference
		expect(clone[2] as Record<string, unknown>).not.toBe(original[2]);
		expect((clone[2] as { a: () => string }).a).toBe((original[2] as { a: () => string }).a); // Function copied by reference
	});

	it("should deep clone class instances without functions", () => {
		class SimpleClass {
			constructor(public value: number) {}
		}
		const original = new SimpleClass(10);
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone instanceof SimpleClass).toBe(true);
	});

	it("should deep clone class instances with functions (methods)", () => {
		class ClassWithMethod {
			constructor(public value: number) {}

			getValue(): number {
				return this.value;
			}
		}
		const original = new ClassWithMethod(20);
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone instanceof ClassWithMethod).toBe(true);
		// Check if method exists and works
		expect(typeof clone.getValue).toBe("function");
		expect(clone.getValue()).toBe(20);
	});

	it("should handle nested class instances", () => {
		class Inner {
			constructor(public name: string) {}
		}

		class Outer {
			constructor(public inner: Inner) {}
		}
		const original = new Outer(new Inner("test"));
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone.inner).not.toBe(original.inner);
		expect(clone instanceof Outer).toBe(true);
		expect(clone.inner instanceof Inner).toBe(true);
	});

	it("should handle complex structures with mixed types", () => {
		const function_ = (): number => 1;

		class TestClass {
			method = function_;
		}

		const original = {
			a: 1,
			b: "string",
			c: new Date(),
			d: [1, { e: function_ }, new TestClass()],
			f: new TestClass(),
			g: function_,
		};
		const clone = safeDeepClone(original);

		expect(clone).toEqual(original);
		expect(clone).not.toBe(original);
		expect(clone.c).not.toBe(original.c);
		expect(clone.d).not.toBe(original.d);
		expect(clone.d[1] as Record<string, unknown>).not.toBe(original.d[1]);
		expect((clone.d[1] as { e: () => number }).e).toBe((original.d[1] as { e: () => number }).e);
		expect(clone.d[2]).not.toBe(original.d[2]);
		expect((clone.d[2] as TestClass).method).toBe((original.d[2] as TestClass).method);
		expect(clone.f).not.toBe(original.f);
		expect(clone.f.method).toBe(original.f.method);
		expect(clone.g).toBe(original.g);
	});

	// Optional: Test potential edge cases if structuredClone fails (difficult to test reliably)
});
