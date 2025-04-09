import type { ELoggerLogLevel } from "@domain/enum";

/**
 * The options for the console logger.
 * @see {@link https://elsikora.com/docs/cladi/services/logging} for more details on logging options.
 */
export interface IConsoleLoggerOptions {
	/**
	 * The log level to use.
	 * @default ELoggerLogLevel.INFO
	 */
	level?: ELoggerLogLevel;

	/**
	 * The source to use for the logger.
	 */
	source?: string;
}
