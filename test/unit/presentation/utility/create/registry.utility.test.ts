import type { ILogger } from "@domain/interface";
import type { IBaseRegistryOptions } from "@infrastructure/interface";

import { BaseRegistry } from "@infrastructure/class/base";
import { createRegistry } from "@presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Logger dependency
const mockLogger: ILogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() };

// Mock the actual BaseRegistry class
vi.mock("@infrastructure/class/base/registry.class", () => ({
	BaseRegistry: vi.fn().mockImplementation((options) => ({
		__type: "MockRegistry",
		options: options,
	})),
}));

describe("createRegistry Utility", () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Or specifically: vi.mocked(BaseRegistry).mockClear();
	});

	it("should create a BaseRegistry instance with provided options", () => {
		const options: IBaseRegistryOptions = {
			logger: mockLogger,
		};
		const registry = createRegistry(options);
		expect(BaseRegistry).toHaveBeenCalledTimes(1);
		expect(BaseRegistry).toHaveBeenCalledWith(options);
		// Check the returned object structure (based on mock)
		expect((registry as any).__type).toBe("MockRegistry");
		expect((registry as any).options).toEqual(options);
	});

	// Test case for potentially missing logger (if BaseRegistry handles defaults)
	it("should create a BaseRegistry instance even if logger is not explicitly provided in options", () => {
		const options: IBaseRegistryOptions = {}; // No logger
		const registry = createRegistry(options);
		expect(BaseRegistry).toHaveBeenCalledTimes(1);
		expect(BaseRegistry).toHaveBeenCalledWith(options);
		expect((registry as any).__type).toBe("MockRegistry");
		expect((registry as any).options).toEqual(options);
	});
});
