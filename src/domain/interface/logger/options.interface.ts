import type { ELoggerLogLevel } from "@domain/enum";

export interface ILoggerOptions {
	/**
	 * The level of the logger.
	 * @default ELoggerLogLevel.INFO
	 */
	level?: ELoggerLogLevel;
}
