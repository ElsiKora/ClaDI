import type { ILogger, ILoggerMethodOptions } from "@domain/interface";
import type { IConsoleLoggerOptions } from "@infrastructure/interface";

import { ELoggerLogLevel } from "@domain/enum";
import { CONSOLE_LOGGER_DEFAULT_OPTIONS } from "@infrastructure/constant";

/**
 * Console logger implementation.
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
	 * @param {IConsoleLoggerOptions} options - The options to use for the logger.
	 */
	constructor(options: IConsoleLoggerOptions = CONSOLE_LOGGER_DEFAULT_OPTIONS) {
		this.LEVEL = options.level;
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
