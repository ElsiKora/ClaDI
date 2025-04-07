import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS, ConsoleLoggerService } from "src";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Helper to check formatted message structure (adjust regex as needed for exact format)
// Corrected regex: Handles optional source `[source]` or `[source → methodSource]`
const LOG_MESSAGE_REGEX = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\] (ERROR|WARN|INFO|DEBUG|TRACE): (?:\s?\[([^[\]→\s]+(?: → [^[\]\s]+)?)\])?\s?(.+?)(?:\s(\{.*?\}))?$/;

describe("ConsoleLoggerService", () => {
	// Store original console methods
	const originalConsole = { ...console };

	// Mock console methods using vi.fn()
	const consoleMocks = {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		trace: vi.fn(),
		warn: vi.fn(),
	};

	// Mock Date to control timestamp
	const testTimestamp = "2024-01-01T12:00:00.000Z";
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(testTimestamp));
		// Assign mocks to global console
		globalThis.console = { ...originalConsole, ...consoleMocks };
		// Reset mocks history
		vi.clearAllMocks(); // Still useful if other mocks are used
		consoleMocks.debug.mockClear();
		consoleMocks.error.mockClear();
		consoleMocks.info.mockClear();
		consoleMocks.trace.mockClear();
		consoleMocks.warn.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		// Restore original console
		globalThis.console = originalConsole;
	});

	it("should be defined", () => {
		const options: IConsoleLoggerOptions = CONSOLE_LOGGER_DEFAULT_OPTIONS;
		const logger = new ConsoleLoggerService(options);
		expect(logger).toBeDefined();
	});

	it("should use default options if none provided", () => {
		const logger = new ConsoleLoggerService(); // No options
		logger.info("Default test");
		expect(consoleMocks.info).toHaveBeenCalled();
	});

	describe("Log Level Filtering", () => {
		const testCases: Array<[ELoggerLogLevel, keyof typeof consoleMocks, boolean]> = [
			// Level set to ERROR
			[ELoggerLogLevel.ERROR, "error", true],
			[ELoggerLogLevel.ERROR, "warn", false],
			[ELoggerLogLevel.ERROR, "info", false],
			[ELoggerLogLevel.ERROR, "debug", false],
			[ELoggerLogLevel.ERROR, "trace", false],
			// Level set to WARN
			[ELoggerLogLevel.WARN, "error", true],
			[ELoggerLogLevel.WARN, "warn", true],
			[ELoggerLogLevel.WARN, "info", false],
			[ELoggerLogLevel.WARN, "debug", false],
			[ELoggerLogLevel.WARN, "trace", false],
			// Level set to INFO
			[ELoggerLogLevel.INFO, "error", true],
			[ELoggerLogLevel.INFO, "warn", true],
			[ELoggerLogLevel.INFO, "info", true],
			[ELoggerLogLevel.INFO, "debug", false],
			[ELoggerLogLevel.INFO, "trace", false],
			// Level set to DEBUG
			[ELoggerLogLevel.DEBUG, "error", true],
			[ELoggerLogLevel.DEBUG, "warn", true],
			[ELoggerLogLevel.DEBUG, "info", true],
			[ELoggerLogLevel.DEBUG, "debug", true],
			[ELoggerLogLevel.DEBUG, "trace", false],
			// Level set to TRACE
			[ELoggerLogLevel.TRACE, "error", true],
			[ELoggerLogLevel.TRACE, "warn", true],
			[ELoggerLogLevel.TRACE, "info", true],
			[ELoggerLogLevel.TRACE, "debug", true],
			[ELoggerLogLevel.TRACE, "trace", true],
		];

		for (const [setLevel, methodToCall, shouldLog] of testCases) {
			it(`should ${shouldLog ? "" : "NOT "}log ${methodToCall} messages when level is ${setLevel}`, () => {
				const logger = new ConsoleLoggerService({ level: setLevel });
				const message = `Test ${methodToCall} message`;
				logger[methodToCall](message);

				if (shouldLog) {
					expect(consoleMocks[methodToCall]).toHaveBeenCalledTimes(1);
					expect(consoleMocks[methodToCall]).toHaveBeenCalledWith(expect.stringContaining(message));
				} else {
					expect(consoleMocks[methodToCall]).not.toHaveBeenCalled();
				}
			});
		}
	});

	describe("Message Formatting", () => {
		const logger = new ConsoleLoggerService({ level: ELoggerLogLevel.TRACE }); // Log everything for format tests
		const message = "Format test";

		it("should format basic message correctly", () => {
			logger.info(message);
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringMatching(LOG_MESSAGE_REGEX));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[1]).toBe(testTimestamp); // Check timestamp
				expect(match[2]).toBe("INFO"); // Level
				expect(match[3]).toBeUndefined(); // Source
				expect(match[4]).toBe(message); // Original Message
				expect(match[5]).toBeUndefined(); // Context
			}
		});

		it("should include source from options", () => {
			const source = "TestSource";
			logger.info(message, { source });
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringContaining(`[${source}] ${message}`));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[3]).toBe(source); // Check source part of regex
			}
		});

		it("should include source from constructor options", () => {
			const source = "ConstructorSource";
			const loggerWithSource = new ConsoleLoggerService({ level: ELoggerLogLevel.TRACE, source });
			loggerWithSource.info(message);
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringContaining(`[${source}] ${message}`));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[3]).toBe(source);
			}
		});

		it("should combine source from constructor and method options", () => {
			const constructorSource = "ConstructorSource";
			const methodSource = "MethodSource";
			const combinedSource = `${constructorSource} → ${methodSource}`;
			const loggerWithSource = new ConsoleLoggerService({ level: ELoggerLogLevel.TRACE, source: constructorSource });
			loggerWithSource.info(message, { source: methodSource });
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringContaining(`[${combinedSource}] ${message}`));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[3]).toBe(combinedSource);
			}
		});

		it("should include context from options", () => {
			const context = { data: "abc", userId: 123 };
			const contextString = JSON.stringify(context);
			logger.info(message, { context });
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringContaining(`${message} ${contextString}`));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[5]).toBe(contextString);
			}
		});

		it("should include source and context from options", () => {
			const source = "TestSource";
			const context = { status: "ok" };
			const contextString = JSON.stringify(context);
			logger.info(message, { context, source });
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringContaining(`[${source}] ${message} ${contextString}`));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[3]).toBe(source);
				expect(match[5]).toBe(contextString);
			}
		});

		it("should handle undefined source and context gracefully", () => {
			logger.info(message, { context: undefined, source: undefined });
			expect(consoleMocks.info).toHaveBeenCalledWith(expect.stringMatching(LOG_MESSAGE_REGEX));
			const loggedMessage = consoleMocks.info.mock.calls[0][0] as string;
			const match = LOG_MESSAGE_REGEX.exec(loggedMessage);
			expect(match).not.toBeNull();

			if (match) {
				expect(match[1]).toBe(testTimestamp);
				expect(match[2]).toBe("INFO");
				expect(match[3]).toBeUndefined(); // Source
				expect(match[4]).toBe(message);
				expect(match[5]).toBeUndefined(); // Context
			}
		});
	});
});
