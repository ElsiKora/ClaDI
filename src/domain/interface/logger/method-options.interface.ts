/**
 * Log options interface.
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
