import type { ILogger, IRegistry } from "@domain/interface";
import type { TConstructor } from "@domain/type";

/**
 * Base factory creation options.
 * @template T The type of items in the registry and created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory} for more details.
 */
export interface IBaseFactoryOptions<T> {
	/**
	 * Optional custom creator function.
	 * Full control over instance creation with access to both name and template.
	 * Highest priority method if provided.
	 *
	 * Use this for class instances to ensure proper instantiation:
	 * ```
	 * creator: (name, template) => {
	 *   // Create a properly instantiated object
	 *   return new MyClass(template.prop1, template.prop2);
	 * }
	 * ```
	 */
	creator?: (ctor: TConstructor<T>, arguments_: Array<any>) => T;

	/**
	 * The logger to use for logging.
	 * @default new ConsoleLoggerService()
	 */
	logger?: ILogger;

	/**
	 * The registry to use for creating items.
	 */
	registry: IRegistry<T>;
}
