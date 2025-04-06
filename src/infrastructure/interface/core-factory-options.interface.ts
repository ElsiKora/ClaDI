import type { ILogger } from "@domain/interface";

/**
 * Options for the CoreFactory.
 */
export interface ICoreFactoryOptions {
	/**
	 * The logger to use for the factory.
	 */
	logger?: ILogger;
}
