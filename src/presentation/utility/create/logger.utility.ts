import type { ILogger } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { CONSOLE_LOGGER_DEFAULT_OPTIONS } from "@infrastructure/constant";
import { ConsoleLoggerService } from "@infrastructure/service";

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
