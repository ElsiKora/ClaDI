import type { ILogger } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Creates a new logger instance.
 * @param {IConsoleLoggerOptions} [options] - The options to use for the logger.
 * @returns {ILogger} A new logger instance.
 * @see {@link https://elsikora.com/docs/cladi/utilities/creation-helpers/createLogger} for more information on this utility.
 * @example
 * ```typescript
 * // Default logger (level INFO)
 * const logger1 = createLogger();
 * logger1.info("Info message");
 *
 * // Debug logger with a source identifier
 * const logger2 = createLogger({
 *   level: ELoggerLogLevel.DEBUG,
 *   source: "MyModule",
 * });
 * logger2.debug("Debug message from MyModule");
 * ```
 */
export function createLogger(options?: IConsoleLoggerOptions): ILogger {
	return new ConsoleLoggerService(options);
}
