import type { ILogger, IRegistry } from "@domain/interface";

/**
 * Base factory creation options.
 * @template T The type of items in the registry and created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory} for more details.
 */
export interface IBaseFactoryOptions<T> {
	/**
	 * The logger to use for logging.
	 * @default new ConsoleLoggerService()
	 */
	logger?: ILogger;

	/**
	 * The registry to use for creating items.
	 */
	registry: IRegistry<T>;

	/**
	 * The transformer to use for creating items.
	 */
	transformer?: (template: T) => T;
}
