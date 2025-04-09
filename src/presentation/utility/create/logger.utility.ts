import type { ILogger } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Creates a new logger instance.
 * @param {IConsoleLoggerOptions} [options] - The options to use for the logger.
 * @returns {ILogger} A new logger instance.
 * @see {@link https://elsikora.com/docs/cladi/services/logging} for more information on the logging service.
 */
export function createLogger(options?: IConsoleLoggerOptions): ILogger {
	return new ConsoleLoggerService(options);
}
