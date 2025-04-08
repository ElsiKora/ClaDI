/**
 * Standard error interface for all application errors.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/error-handling}
 */
export interface IError extends Error {
	/**
	 * Original error that caused this error, if any.
	 */
	CAUSE?: Error;

	/**
	 * Error code to uniquely identify error types.
	 */
	CODE: string;

	/**
	 * Additional context about the error.
	 */
	context?: Record<string, unknown>;
}
