import type { ILogger } from "@domain/interface/logger/interface";

/**
 * Base registry creation options.
 */
export interface IBaseRegistryOptions {
	/**
	 * The logger to use for logging.
	 */
	logger?: ILogger;
}
