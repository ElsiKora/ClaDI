import type { ILogger } from "@domain/interface";

/**
 * The options for the base container.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container} for more details.
 */
export interface IBaseContainerOptions {
	/**
	 * The logger to use for the container.
	 * @default new ConsoleLoggerService()
	 */
	logger?: ILogger;
}
