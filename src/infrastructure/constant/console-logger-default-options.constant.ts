import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";

/**
 * The default options for the console logger.
 */
export const CONSOLE_LOGGER_DEFAULT_OPTIONS: IConsoleLoggerOptions = { level: ELoggerLogLevel.INFO };
