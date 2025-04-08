/**
 * Base options interface.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/error-handling} for more details.
 */
export interface IBaseErrorOptions {
	/**
	 * Original error that caused this error, if any.
	 */
	cause?: Error;

	/**
	 * Error code for programmatic handling.
	 */
	code: string;

	/**
	 * Additional context about the error.
	 */
	context?: Record<string, unknown>;

	/**
	 * Source identifier (e.g. "[AuthService]", "[UserRepository]").
	 */
	source?: string;
}
