import type { ILogger } from "@domain/interface";

/**
 * Base registry creation options.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry} for more details.
 */
export interface IBaseRegistryOptions {
	/**
	 * The logger to use for logging.
	 * @default new ConsoleLoggerService()
	 */
	logger?: ILogger;
}
