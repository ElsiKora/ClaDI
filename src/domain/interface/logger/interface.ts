import type { ILoggerMethodOptions } from "./method-options.interface";

/**
 * Logger interface.
 * @see {@link https://elsikora.com/docs/cladi/services/logging}
 */
export interface ILogger {
	/**
	 * Log a debug message.
	 * @param message Message to log.
	 * @param options Optional logging options.
	 */
	debug(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log an error message.
	 * @param message Message to log.
	 * @param options Optional logging options.
	 */
	error(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log an info message.
	 * @param message Message to log.
	 * @param options Optional logging options.
	 */
	info(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log a trace message.
	 * @param message Message to log.
	 * @param options Optional logging options.
	 */
	trace(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log a warning message.
	 * @param message Message to log.
	 * @param options Optional logging options.
	 */
	warn(message: string, options?: ILoggerMethodOptions): void;
}
