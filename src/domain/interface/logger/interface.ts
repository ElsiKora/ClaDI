import type { ILoggerMethodOptions, ILoggerOptions } from "@domain/interface";

/**
 * Logger interface.
 * @see {@link https://elsikora.com/docs/cladi/services/logging}
 */
export interface ILogger {
	/**
	 * Log a debug message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} options Optional logging options.
	 */
	debug(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log an error message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} options Optional logging options.
	 */
	error(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Get the default options for the logger
	 * @returns {ILoggerOptions} The default options for the logger
	 */
	getDefaultOptions(): ILoggerOptions;

	/**
	 * Get the description of the logger
	 * @returns {string} The description of the logger
	 */
	getDescription(): string;

	/**
	 * Get the name of the logger
	 * @returns {string} The name of the logger
	 */
	getName(): string;

	/**
	 * Log an info message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} options Optional logging options.
	 */
	info(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Log a trace message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} options Optional logging options.
	 */
	trace(message: string, options?: ILoggerMethodOptions): void;

	/**
	 * Validate the logger options
	 * @param {ILoggerOptions} options The options to validate
	 * @returns {boolean} True if the options are valid
	 */
	validateOptions(options: ILoggerOptions): boolean;

	/**
	 * Log a warning message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} options Optional logging options.
	 */
	warn(message: string, options?: ILoggerMethodOptions): void;
}
