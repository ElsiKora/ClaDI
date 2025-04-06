import type { IRegistry } from "@domain/interface";
import type { ILogger } from "@domain/interface/logger/interface";

/**
 * Base factory creation options.
 * @template T The type of items in the registry and created by the factory.
 */
export interface IBaseFactoryOptions<T> {
	/**
	 * The logger to use for logging.
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
