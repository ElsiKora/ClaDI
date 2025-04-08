import { ELoggerLogLevel } from "@domain/enum";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS } from "@infrastructure/constant";
import { ConsoleLoggerService } from "@infrastructure/service";
import { createLogger } from "@presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the actual ConsoleLoggerService class
vi.mock("@infrastructure/service/console-logger.service", () => ({
	ConsoleLoggerService: vi.fn().mockImplementation((options) => ({
		__type: "MockLogger",
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		options: options,
		trace: vi.fn(),
		warn: vi.fn(),
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
