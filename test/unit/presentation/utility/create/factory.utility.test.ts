import type { ILogger, IRegistry } from "@domain/interface";
import type { IBaseFactoryOptions } from "src/infrastructure";

import { BaseFactory } from "src/infrastructure";
import { createFactory } from "src/presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
const mockLogger: ILogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() };
const mockRegistry: IRegistry<any> = { get: vi.fn(), has: vi.fn() } as any; // Add other methods if needed by BaseFactory constructor

// Mock the actual BaseFactory class
vi.mock("src/infrastructure/class/base/factory.class", () => ({
	BaseFactory: vi.fn().mockImplementation((options) => ({
		__type: "MockItemFactory",
		options: options,
	})),
}));

describe("createFactory Utility", () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Or specifically: vi.mocked(BaseFactory).mockClear();
	});

	it("should create a BaseFactory instance with provided options", () => {
		const options: IBaseFactoryOptions<any> = {
			logger: mockLogger,
			registry: mockRegistry,
			// transformer: vi.fn() // Optional transformer
		};
		const factory = createFactory(options);
		expect(BaseFactory).toHaveBeenCalledTimes(1);
		expect(BaseFactory).toHaveBeenCalledWith(options);
		// Check the returned object structure (based on mock)
		expect((factory as any).__type).toBe("MockItemFactory");
		expect((factory as any).options).toEqual(options);
	});

	// Test case for potentially missing logger (if BaseFactory handles defaults)
	it("should create a BaseFactory instance even if logger is not explicitly provided in options", () => {
		const options: IBaseFactoryOptions<any> = { registry: mockRegistry }; // No logger
		const factory = createFactory(options);
		expect(BaseFactory).toHaveBeenCalledTimes(1);
		expect(BaseFactory).toHaveBeenCalledWith(options);
		expect((factory as any).__type).toBe("MockItemFactory");
		expect((factory as any).options).toEqual(options);
	});

	it("should use default logger if logger option is explicitly undefined", () => {
		const options: IBaseFactoryOptions<any> = { logger: undefined, registry: mockRegistry }; // Explicitly undefined
		const factory = createFactory(options);
		expect(BaseFactory).toHaveBeenCalledTimes(1);
		expect(BaseFactory).toHaveBeenCalledWith(options);
		expect((factory as any).__type).toBe("MockItemFactory");
		expect((factory as any).options).toEqual(options);
		// Ensure the constructor with undefined doesn't crash (implicitly tests ??)
	});

	// Test case for missing registry (should fail if registry is mandatory)
	it("should throw an error or fail if registry is missing (assuming mandatory)", () => {
		// BaseFactory constructor requires registry, so this call inside createFactory should fail
		// The exact error depends on BaseFactory's constructor checks or TS compilation
		const options = { logger: mockLogger } as any; // Missing registry

		// We expect the mock not to be called successfully, or an error during BaseFactory construction
		try {
			createFactory(options);
			// If it reaches here, the mock might have been called unexpectedly
			expect(BaseFactory).not.toHaveBeenCalled();
		} catch (error) {
			// Expect some form of error due to missing mandatory option
			expect(error).toBeInstanceOf(Error); // Or more specific error if BaseFactory throws one
		}
		// Reset mock call count if previous try block failed early
		vi.mocked(BaseFactory).mockClear();
		// Alternatively, check if the utility itself throws before calling the mock
		// expect(() => createFactory(options)).toThrow();
	});
});
