import type { ILoggerMethodOptions } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT } from "@infrastructure/constant";
import { ConsoleLoggerService } from "@infrastructure/service";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock console methods
const consoleSpies = {
	debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
	error: vi.spyOn(console, "error").mockImplementation(() => {}),
	info: vi.spyOn(console, "info").mockImplementation(() => {}),
	trace: vi.spyOn(console, "trace").mockImplementation(() => {}),
	warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
};

// Helper regex to match ISO timestamp
const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

describe("ConsoleLoggerService", () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original console functions after all tests in this suite
		// vi.restoreAllMocks(); // Typically done in a global setup/teardown
	});

	describe("constructor", () => {
		it("should use default options if none provided", () => {
			const logger = new ConsoleLoggerService();
			expect((logger as any).LEVEL).toBe(CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT.level);
			expect((logger as any).SOURCE).toBeUndefined();
		});

		it("should use provided options", () => {
			const options: IConsoleLoggerOptions = {
				level: ELoggerLogLevel.DEBUG,
				source: "TestSource",
			};
			const logger = new ConsoleLoggerService(options);
			expect((logger as any).LEVEL).toBe(options.level);
			expect((logger as any).SOURCE).toBe(options.source);
		});

		it("should use default level if only source is provided", () => {
			const options: IConsoleLoggerOptions = { source: "TestSourceOnly" };
			const logger = new ConsoleLoggerService(options);
			expect((logger as any).LEVEL).toBe(ELoggerLogLevel.INFO);
			expect((logger as any).SOURCE).toBe(options.source);
		});

		it("should call validateOptions (even though it currently does nothing)", () => {
			const validateSpy = vi.spyOn(ConsoleLoggerService.prototype, "validateOptions");
			const options = { level: ELoggerLogLevel.WARN };
			new ConsoleLoggerService(options);
			expect(validateSpy).toHaveBeenCalledWith(options);
			validateSpy.mockRestore();
		});
	});

	describe("Logging Methods", () => {
		const testCases = [
			{ consoleMethod: "debug" as keyof typeof consoleSpies, level: ELoggerLogLevel.DEBUG, method: "debug" as keyof ConsoleLoggerService },
			{ consoleMethod: "error" as keyof typeof consoleSpies, level: ELoggerLogLevel.ERROR, method: "error" as keyof ConsoleLoggerService },
			{ consoleMethod: "info" as keyof typeof consoleSpies, level: ELoggerLogLevel.INFO, method: "info" as keyof ConsoleLoggerService },
			{ consoleMethod: "trace" as keyof typeof consoleSpies, level: ELoggerLogLevel.TRACE, method: "trace" as keyof ConsoleLoggerService },
			{ consoleMethod: "warn" as keyof typeof consoleSpies, level: ELoggerLogLevel.WARN, method: "warn" as keyof ConsoleLoggerService },
		];

		for (const { consoleMethod, level, method } of testCases) {
			describe(method, () => {
				it(`should log a message when logger level is ${level} or higher`, () => {
					// Set logger level to the minimum (TRACE) to ensure all levels are tested for logging
					const logger = new ConsoleLoggerService({ level: ELoggerLogLevel.TRACE });
					(logger[method] as Function)("Test Message");
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledTimes(1);
					// Match the timestamp part with regex, the rest exactly
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\[${timestampRegex.source}\\] ${level.toUpperCase()}: Test Message$`)));
				});

				it("should not log a message when logger level is lower", () => {
					// Set logger level one step HIGHER priority (lower index) than the message level
					const levelOrder = [ELoggerLogLevel.ERROR, ELoggerLogLevel.WARN, ELoggerLogLevel.INFO, ELoggerLogLevel.DEBUG, ELoggerLogLevel.TRACE];
					const currentLevelIndex = levelOrder.indexOf(level);
					const higherPriorityLevel = currentLevelIndex > 0 ? levelOrder[currentLevelIndex - 1] : undefined;

					if (higherPriorityLevel) {
						// Cannot test this case if level is already ERROR (index 0)
						const logger = new ConsoleLoggerService({ level: higherPriorityLevel });
						(logger[method] as Function)("Test Message");
						expect(consoleSpies[consoleMethod]).not.toHaveBeenCalled();
					}
				});

				it("should include context if provided", () => {
					const logger = new ConsoleLoggerService({ level });
					const context = { data: "abc", userId: 1 };
					const escapedContext = JSON.stringify(context).replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`); // Escape regex chars
					(logger[method] as Function)("Context message", { context });
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\\[${timestampRegex.source}\\\] ${level.toUpperCase()}: Context message ${escapedContext}$`)));
				});

				it("should include source if provided in options", () => {
					const logger = new ConsoleLoggerService({ level });
					const options: ILoggerMethodOptions = { source: "MethodSource" };
					(logger[method] as Function)("Source message", options);
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\\[${timestampRegex.source}\\\] ${level.toUpperCase()}: \\[MethodSource\\] Source message$`))); // Double escape brackets
				});

				it("should include combined source if provided in constructor and options", () => {
					const logger = new ConsoleLoggerService({ level, source: "ClassSource" });
					const options: ILoggerMethodOptions = { source: "MethodSource" };
					(logger[method] as Function)("Combined source", options);
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\\[${timestampRegex.source}\\\] ${level.toUpperCase()}: \\[ClassSource → MethodSource\\] Combined source$`))); // Double escape brackets
				});

				it("should include only class source if provided in constructor only", () => {
					const logger = new ConsoleLoggerService({ level, source: "ClassSourceOnly" });
					(logger[method] as Function)("Class source only");
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^\\\[${timestampRegex.source}\\\] ${level.toUpperCase()}: \\[ClassSourceOnly\\] Class source only$`))); // Double escape brackets
				});

				it("should format message correctly with timestamp, level, source, message, context", () => {
					const logger = new ConsoleLoggerService({ level: ELoggerLogLevel.TRACE, source: "App" });
					const options: ILoggerMethodOptions = { context: { key: "val" }, source: "Module" };
					(logger[method] as Function)("Full format", options);

					// Fix the regex: escape backslashes in \d
					const expectedPattern = new RegExp(
						`^\\\[${timestampRegex.source}\\\] ${level.toUpperCase()}: \\[App → Module\\] Full format \\{"key":"val"\\}$`, // Double escape brackets and braces
					);
					expect(consoleSpies[consoleMethod]).toHaveBeenCalledWith(expect.stringMatching(expectedPattern));
				});
			});
		}
	});

	describe("Helper Methods", () => {
		it("getDefaultOptions should return the default constant", () => {
			const logger = new ConsoleLoggerService();
			expect(logger.getDefaultOptions()).toBe(CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT);
		});

		it("getDescription should return correct string", () => {
			const logger = new ConsoleLoggerService();
			expect(logger.getDescription()).toBe("Console logger");
		});

		it("getName should return correct string", () => {
			const logger = new ConsoleLoggerService();
			expect(logger.getName()).toBe("console");
		});

		it("validateOptions currently returns true", () => {
			const logger = new ConsoleLoggerService();
			expect(logger.validateOptions({})).toBe(true);
			expect(logger.validateOptions({ level: ELoggerLogLevel.ERROR })).toBe(true);
		});
	});
});
