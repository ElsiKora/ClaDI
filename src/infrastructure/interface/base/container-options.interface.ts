import type { ILogger } from "@domain/interface";

/**
 * The options for the base container.
 */
export interface IBaseContainerOptions {
	/**
	 * The logger to use for the container.
	 */
	logger?: ILogger;
}
