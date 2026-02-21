import type { IError } from "@domain/interface";
import type { IBaseErrorOptions } from "@infrastructure/interface";

/**
 * Base error class.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/error-handling}
 */
export class BaseError extends Error implements IError {
	public get cause(): Error | undefined {
		return this.CAUSE;
	}

	public get code(): string {
		return this.CODE;
	}

	public get context(): Record<string, unknown> | undefined {
		return this.CONTEXT;
	}

	public get source(): string | undefined {
		return this.SOURCE;
	}

	private readonly CAUSE?: Error;

	private readonly CODE: string;

	private readonly CONTEXT?: Record<string, unknown>;

	private readonly SOURCE?: string;

	/**
	 * Creates a new base error.
	 * @param {string} message Error message.
	 * @param {IBaseErrorOptions} options Error options.
	 */
	constructor(message: string, options: IBaseErrorOptions) {
		super(message);
		this.name = this.constructor.name;
		this.CAUSE = options.cause;
		this.CODE = options.code;
		this.CONTEXT = options.context;
		this.SOURCE = options.source;

		if (typeof Error.captureStackTrace === "function") {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}
