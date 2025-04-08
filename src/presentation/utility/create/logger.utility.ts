import type { ILogger } from "@domain/interface";

import { CONSOLE_LOGGER_DEFAULT_OPTIONS, ConsoleLoggerService, type IConsoleLoggerOptions } from "@infrastructure/index";

/**
 * Creates a new logger instance.
 * @param {IConsoleLoggerOptions} [options] - The options to use for the logger.
 * @default
 * @returns {ILogger} A new logger instance.
 * @see {@link https://elsikora.com/docs/cladi/services/logging} for more information on the logging service.
 */
export function createLogger(options: IConsoleLoggerOptions = CONSOLE_LOGGER_DEFAULT_OPTIONS): ILogger {
	return new ConsoleLoggerService(options);
}
