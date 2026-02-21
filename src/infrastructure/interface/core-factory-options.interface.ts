import type { ILogger } from "@domain/interface";

/**
 * Options for the CoreFactory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
 */
export interface ICoreFactoryOptions {
	/**
	 * The logger to use for the factory.
	 * @default new ConsoleLoggerService()
	 */
	logger?: ILogger;
}
