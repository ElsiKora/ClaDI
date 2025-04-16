import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { ConsoleLoggerService } from "@infrastructure/service";
import { createLogger } from "@presentation/utility/create";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the ConsoleLoggerService implementation
vi.mock("@infrastructure/service", () => ({
	ConsoleLoggerService: vi.fn(),
}));

describe("createLogger utility", () => {
	const mockLoggerInstance = { name: "MockInstance" };

	beforeEach(() => {
		vi.clearAllMocks();
		(ConsoleLoggerService as ReturnType<typeof vi.fn>).mockImplementation(() => mockLoggerInstance);
	});

	it("should call ConsoleLoggerService constructor with provided options", () => {
		const options: IConsoleLoggerOptions = {
			level: ELoggerLogLevel.WARN,
			source: "UtilityTestSource",
		};
		const logger = createLogger(options);

		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(options);
		expect(logger).toBe(mockLoggerInstance);
	});

	it("should call ConsoleLoggerService constructor without options if none provided", () => {
		const logger = createLogger();

		expect(ConsoleLoggerService).toHaveBeenCalledTimes(1);
		expect(ConsoleLoggerService).toHaveBeenCalledWith(undefined); // Called with undefined when no args
		expect(logger).toBe(mockLoggerInstance);
	});
});
