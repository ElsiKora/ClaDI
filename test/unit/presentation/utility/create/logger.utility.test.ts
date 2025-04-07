import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS, ConsoleLoggerService } from "src/infrastructure";
import { createLogger } from "src/presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the actual ConsoleLoggerService class
vi.mock("src/infrastructure/service/console-logger.service", () => ({
	ConsoleLoggerService: vi.fn().mockImplementation((options) => ({
		__type: "MockLogger", // Add identifier for assertion
		options: options ?? CONSOLE_LOGGER_DEFAULT_OPTIONS,
	})),
}));

describe("createLogger Utility", () => {
	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Or specifically: vi.mocked(ConsoleLoggerService).mockClear();
	});

	it("should create a ConsoleLoggerService instance with default options if none provided", () => {
		const logger = createLogger();
		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(CONSOLE_LOGGER_DEFAULT_OPTIONS);
		// Check the returned object structure (based on mock)
		expect((logger as any).__type).toBe("MockLogger");
		expect((logger as any).options).toEqual(CONSOLE_LOGGER_DEFAULT_OPTIONS);
	});

	it("should create a ConsoleLoggerService instance with provided options", () => {
		const options: IConsoleLoggerOptions = {
			level: ELoggerLogLevel.ERROR,
			source: "TestCreateLogger",
		};
		const logger = createLogger(options);
		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(options);
		// Check the returned object structure (based on mock)
		expect((logger as any).__type).toBe("MockLogger");
		expect((logger as any).options).toEqual(options);
	});
});
