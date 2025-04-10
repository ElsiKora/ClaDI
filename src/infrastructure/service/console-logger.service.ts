import type { ILogger, ILoggerMethodOptions, ILoggerOptions } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT } from "@infrastructure/constant";

/**
 * Console logger implementation.
 * @see {@link https://elsikora.com/docs/cladi/services/logging}
 */
export class ConsoleLoggerService implements ILogger {
	/**
	 * Current log level. Messages below this level will not be logged.
	 */
	private readonly LEVEL: ELoggerLogLevel;

	/**
	 * Default source identifier.
	 */
	private readonly SOURCE?: string;

	/**
	 * Create a new console logger.
	 * @param {IConsoleLoggerOptions} [options] - The options to use for the logger.
	 */
	constructor(options: IConsoleLoggerOptions = CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT) {
		if (!this.validateOptions(options)) {
			throw new BaseError("Invalid options", {
				code: "INVALID_OPTIONS",
				source: "ConsoleLoggerService",
			});
		}

		this.LEVEL = options.level ?? ELoggerLogLevel.INFO;
		this.SOURCE = options.source;
	}

	/**
	 * Log a debug message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 */
	public debug(message: string, options?: ILoggerMethodOptions): void {
		if (this.shouldLog(ELoggerLogLevel.DEBUG)) {
			console.debug(this.formatMessage(ELoggerLogLevel.DEBUG, message, options));
		}
	}

	/**
	 * Log an error message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 */
	public error(message: string, options?: ILoggerMethodOptions): void {
		if (this.shouldLog(ELoggerLogLevel.ERROR)) {
			console.error(this.formatMessage(ELoggerLogLevel.ERROR, message, options));
		}
	}

	/**
	 * Get the default options for the logger.
	 * @returns {ILoggerOptions} The default options for the logger.
	 */
	public getDefaultOptions(): ILoggerOptions {
		return CONSOLE_LOGGER_DEFAULT_OPTIONS_CONSTANT;
	}

	/**
	 * Get the description of the logger.
	 * @returns {string} The description of the logger.
	 */
	public getDescription(): string {
		return "Console logger";
	}

	/**
	 * Get the name of the logger.
	 * @returns {string} The name of the logger.
	 */
	public getName(): string {
		return "console";
	}

	/**
	 * Log an info message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 */
	public info(message: string, options?: ILoggerMethodOptions): void {
		if (this.shouldLog(ELoggerLogLevel.INFO)) {
			console.info(this.formatMessage(ELoggerLogLevel.INFO, message, options));
		}
	}

	/**
	 * Log a trace message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 */
	public trace(message: string, options?: ILoggerMethodOptions): void {
		if (this.shouldLog(ELoggerLogLevel.TRACE)) {
			console.trace(this.formatMessage(ELoggerLogLevel.TRACE, message, options));
		}
	}

	/**
	 * Validate the logger options.
	 * @param {ILoggerOptions} _options The options to validate.
	 * @returns {boolean} True if the options are valid.
	 */
	public validateOptions(_options: ILoggerOptions): boolean {
		return true;
	}

	/**
	 * Log a warning message.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 */
	public warn(message: string, options?: ILoggerMethodOptions): void {
		if (this.shouldLog(ELoggerLogLevel.WARN)) {
			console.warn(this.formatMessage(ELoggerLogLevel.WARN, message, options));
		}
	}

	/**
	 * Combines source from options with class source.
	 * @param {string} [optionsSource] Source from options.
	 * @returns {string|undefined} Combined source or undefined if both sources are undefined.
	 */
	private combineSource(optionsSource?: string): string | undefined {
		if (!this.SOURCE && !optionsSource) {
			return undefined;
		}

		if (!this.SOURCE && optionsSource) {
			return `[${optionsSource}]`;
		}

		if (this.SOURCE && !optionsSource) {
			return `[${this.SOURCE}]`;
		}

		if (this.SOURCE && optionsSource) {
			return `[${this.SOURCE} → ${optionsSource}]`;
		}

		return undefined;
	}

	/**
	 * Format a message for logging.
	 * @param {ELoggerLogLevel} level Log level.
	 * @param {string} message Message to log.
	 * @param {ILoggerMethodOptions} [options] Optional logging options.
	 * @returns {string} Formatted message.
	 */
	private formatMessage(level: ELoggerLogLevel, message: string, options?: ILoggerMethodOptions): string {
		const timestamp: string = new Date().toISOString();

		// Safely extract context from options
		let context: Record<string, unknown> | undefined;
		let source: string | undefined;

		if (options) {
			context = options.context;
			source = options.source;
		}

		const formattedContext: string = context ? ` ${JSON.stringify(context)}` : "";
		const formattedSource: string = this.combineSource(source) ?? "";
		const sourceWithSpace: string = formattedSource ? `${formattedSource} ` : "";

		return `[${timestamp}] ${level.toUpperCase()}: ${sourceWithSpace}${message}${formattedContext}`;
	}

	/**
	 * Check if the given level should be logged.
	 * @param {ELoggerLogLevel} level Level to check.
	 * @returns {boolean} True if the level should be logged.
	 */
	private shouldLog(level: ELoggerLogLevel): boolean {
		const levels: Array<ELoggerLogLevel> = [ELoggerLogLevel.ERROR, ELoggerLogLevel.WARN, ELoggerLogLevel.INFO, ELoggerLogLevel.DEBUG, ELoggerLogLevel.TRACE];

		return levels.indexOf(level) <= levels.indexOf(this.LEVEL);
	}
}
