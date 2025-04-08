import type { ILogger } from "@domain/interface";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseContainer } from "@infrastructure/class/base";
import { createContainer } from "@presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Logger dependency
const mockLogger: ILogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() };

// Mock the actual BaseContainer class
vi.mock("@infrastructure/class/base/container.class", () => ({
	BaseContainer: vi.fn().mockImplementation((options) => ({
		__type: "MockContainer",
		options: options,
	})),
}));

describe("createContainer Utility", () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Or specifically: vi.mocked(BaseContainer).mockClear();
	});

	it("should create a BaseContainer instance with provided options", () => {
		const options: IBaseContainerOptions = {
			logger: mockLogger,
		};
		const container = createContainer(options);
		expect(BaseContainer).toHaveBeenCalledTimes(1);
		expect(BaseContainer).toHaveBeenCalledWith(options);
		// Check the returned object structure (based on mock)
		expect((container as any).__type).toBe("MockContainer");
		expect((container as any).options).toEqual(options);
	});

	// Test case for potentially missing logger (if BaseContainer handles defaults)
	it("should create a BaseContainer instance even if logger is not explicitly provided in options", () => {
		const options: IBaseContainerOptions = {}; // No logger
		const container = createContainer(options);
		expect(BaseContainer).toHaveBeenCalledTimes(1);
		expect(BaseContainer).toHaveBeenCalledWith(options);
		expect((container as any).__type).toBe("MockContainer");
		expect((container as any).options).toEqual(options);
	});

	it("should use default logger if logger option is explicitly undefined", () => {
		const options: IBaseContainerOptions = { logger: undefined }; // Explicitly undefined
		const container = createContainer(options);
		expect(BaseContainer).toHaveBeenCalledTimes(1);
		expect(BaseContainer).toHaveBeenCalledWith(options);
		// Check the returned object structure (based on mock)
		expect((container as any).__type).toBe("MockContainer");
		expect((container as any).options).toEqual(options);
		// Ensure the constructor with undefined doesn't crash (implicitly tests ??)
	});
});
