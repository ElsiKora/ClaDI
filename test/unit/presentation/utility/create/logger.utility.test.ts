import { ELoggerLogLevel } from "@domain/enum";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS } from "@infrastructure/constant";
import { ConsoleLoggerService } from "@infrastructure/service";
import { createLogger } from "@presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the ConsoleLoggerService constructor using a function implementation (Vitest constructor-safe pattern).
vi.mock("@infrastructure/service", () => ({
	ConsoleLoggerService: vi.fn(function MockConsoleLoggerService(this: Record<string, unknown>, options: IConsoleLoggerOptions) {
		this.__type = "MockLogger";
		this.debug = vi.fn();
		this.error = vi.fn();
		this.info = vi.fn();
		this.options = options;
		this.trace = vi.fn();
		this.warn = vi.fn();
	}),
}));

describe("createLogger Utility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create a ConsoleLoggerService instance with default options if none provided", () => {
		const logger = createLogger();

		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(CONSOLE_LOGGER_DEFAULT_OPTIONS);
		expect((logger as { __type: string }).__type).toBe("MockLogger");
		expect((logger as { options: IConsoleLoggerOptions }).options).toEqual(CONSOLE_LOGGER_DEFAULT_OPTIONS);
	});

	it("should create a ConsoleLoggerService instance with provided options", () => {
		const options: IConsoleLoggerOptions = {
			level: ELoggerLogLevel.ERROR,
			source: "TestCreateLogger",
		};
		const logger = createLogger(options);

		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(options);
		expect((logger as { __type: string }).__type).toBe("MockLogger");
		expect((logger as { options: IConsoleLoggerOptions }).options).toEqual(options);
	});
});
