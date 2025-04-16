import type { IBaseErrorOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base";
import { describe, expect, it } from "vitest";

describe("BaseError", () => {
	it("should create an instance with message and code", () => {
		const message: string = "Test error message";
		const options: IBaseErrorOptions = { code: "TEST_CODE" };
		const error: BaseError = new BaseError(message, options);

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(BaseError);
		expect(error.message).toBe(message);
		expect(error.CODE).toBe(options.code);
		expect(error.name).toBe("BaseError");
		expect(error.CONTEXT).toBeUndefined();
		expect(error.CAUSE).toBeUndefined();
		expect(error.SOURCE).toBeUndefined();
	});

	it("should create an instance with message, code, and context", () => {
		const message: string = "Error with context";

		const options: IBaseErrorOptions = {
			code: "CONTEXT_CODE",
			context: { details: "something", userId: 123 },
		};
		const error: BaseError = new BaseError(message, options);

		expect(error.message).toBe(message);
		expect(error.CODE).toBe(options.code);
		expect(error.CONTEXT).toEqual(options.context);
		expect(error.CAUSE).toBeUndefined();
		expect(error.SOURCE).toBeUndefined();
	});

	it("should create an instance with message, code, and cause", () => {
		const message: string = "Error with cause";
		const cause: Error = new Error("Original error");

		const options: IBaseErrorOptions = {
			cause: cause,
			code: "CAUSE_CODE",
		};
		const error: BaseError = new BaseError(message, options);

		expect(error.message).toBe(message);
		expect(error.CODE).toBe(options.code);
		expect(error.CAUSE).toBe(cause);
		expect(error.CONTEXT).toBeUndefined();
		expect(error.SOURCE).toBeUndefined();
	});

	it("should create an instance with message, code, and source", () => {
		const message: string = "Error with source";

		const options: IBaseErrorOptions = {
			code: "SOURCE_CODE",
			source: "MyModule",
		};
		const error: BaseError = new BaseError(message, options);

		expect(error.message).toBe(message);
		expect(error.CODE).toBe(options.code);
		expect(error.SOURCE).toBe(options.source);
		expect(error.CONTEXT).toBeUndefined();
		expect(error.CAUSE).toBeUndefined();
	});

	it("should create an instance with all options", () => {
		const message: string = "Full error";
		const cause: Error = new TypeError("Underlying type issue");

		const options: IBaseErrorOptions = {
			cause: cause,
			code: "FULL_CODE",
			context: { value: 5 },
			source: "CoreService",
		};
		const error: BaseError = new BaseError(message, options);

		expect(error.message).toBe(message);
		expect(error.CODE).toBe(options.code);
		expect(error.CAUSE).toBe(cause);
		expect(error.CONTEXT).toEqual(options.context);
		expect(error.SOURCE).toBe(options.source);
	});

	it("should have a stack trace", () => {
		const error: BaseError = new BaseError("Error with stack", { code: "STACK_CODE" });
		expect(error.stack).toBeDefined();
		// Check if the stack trace string contains the class name and message
		expect(error.stack).toContain("BaseError");
		expect(error.stack).toContain("Error with stack");
	});
});
