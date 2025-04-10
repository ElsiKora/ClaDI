import type { IFactory, ILogger, IRegistry } from "@domain/interface";
import type { TConstructor } from "@domain/type";
import type { IBaseFactoryOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base/error.class";
import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Generic factory implementation that creates instances by class constructors stored in the registry.
 * @template T The type of items created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
 */
export class BaseFactory<T> implements IFactory<T> {
	/**
	 * Logger instance.
	 */
	private readonly LOGGER: ILogger;

	/**
	 * Registry instance that stores constructors.
	 */
	private readonly REGISTRY: IRegistry<T>;

	/**
	 * Create a new factory instance.
	 * @param {IBaseFactoryOptions<T>} options Factory options.
	 */
	constructor(options: IBaseFactoryOptions<T>) {
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
		this.REGISTRY = options.registry;
	}

	/**
	 * Create an instance by name with optional constructor arguments.
	 * @param {string} name The name of the item to create.
	 * @param {Array<unknown>} constructorArguments The constructor arguments.
	 * @returns {T} The created instance.
	 * @throws BaseError if no constructor with the given name exists in the registry.
	 */
	public create(name: string, constructorArguments: Array<unknown> = []): T {
		this.LOGGER.info(`Creating instance: ${name}`, { source: "Factory" });
		// Get constructor from registry
		const classConstructor: TConstructor<T> | undefined = this.REGISTRY.get(name);

		if (!classConstructor) {
			throw new BaseError(`Constructor not found: ${name}`, {
				code: "CONSTRUCTOR_NOT_FOUND",
				source: "Factory",
			});
		}

		const instance: T = new classConstructor(...constructorArguments);

		this.LOGGER.info(`Instance created: ${name}`, { source: "Factory" });

		return instance;
	}

	/**
	 * Get the registry associated with this factory.
	 * @returns {IRegistry<T>} The registry instance.
	 */
	public getRegistry(): IRegistry<T> {
		return this.REGISTRY;
	}
}
