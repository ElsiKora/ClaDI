/**
 * Log options interface.
 * @see {@link https://elsikora.com/docs/cladi/services/logging}
 */
export interface ILoggerMethodOptions {
	/**
	 * Optional context to include with the log.
	 */
	context?: Record<string, unknown>;
	/**
	 * Optional source identifier (e.g. "React", "NestJS Scheduler").
	 */
	source?: string;
}
