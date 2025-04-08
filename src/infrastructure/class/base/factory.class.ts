import type { IFactory } from "@domain/interface";
import type { ILogger } from "@domain/interface";
import type { IRegistry } from "@domain/interface";
import type { IBaseFactoryOptions } from "@infrastructure/interface";

import { safeDeepClone } from "@application/utility";
import { BaseError } from "@infrastructure/class/base/error.class";
import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Generic factory implementation that creates items by name using a registry as data source.
 * @template T The type of items created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
 */
export class BaseFactory<T> implements IFactory<T> {
	/**
	 * Internal cache of created items.
	 */
	private readonly CACHE: Map<string, T>;

	/**
	 * Logger instance.
	 */
	private readonly LOGGER: ILogger;

	/**
	 * Registry instance.
	 */
	private readonly REGISTRY: IRegistry<T>;

	/**
	 * Optional custom transformer function.
	 */
	private readonly TRANSFORMER?: (template: T) => T;

	/**
	 * Create a new factory instance.
	 * @param {IBaseFactoryOptions<T>} options Factory options.
	 */
	constructor(options: IBaseFactoryOptions<T>) {
		this.CACHE = new Map<string, T>();
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
		this.REGISTRY = options.registry;
		this.TRANSFORMER = options.transformer;
	}

	/**
	 * Clear all cached items or a specific cached item.
	 * @param {string} [name] Optional name of specific cached item to clear.
	 */
	public clearCache(name?: string): void {
		if (name) {
			this.CACHE.delete(name);
			this.LOGGER.debug(`Cache cleared for item: ${name}`, { source: "Factory" });
		} else {
			this.CACHE.clear();
			this.LOGGER.debug("Factory cache cleared", { source: "Factory" });
		}
	}

	/**
	 * Create an item by name.
	 * @param {string} name The name of the item to create.
	 * @returns {T} The created item.
	 * @throws RegistryItemNotFoundError if no item with the given name exists in the registry.
	 */
	public create(name: string): T {
		this.LOGGER.debug(`Creating item: ${name}`, { source: "Factory" });

		const cachedItem: T | undefined = this.CACHE.get(name);

		if (cachedItem) {
			this.LOGGER.debug(`Retrieved item from cache: ${name}`, { source: "Factory" });

			return safeDeepClone(cachedItem);
		}

		const template: T | undefined = this.REGISTRY.get(name);

		if (!template) {
			throw new BaseError("Template not found", {
				code: "TEMPLATE_NOT_FOUND",
				source: "Factory",
			});
		}

		const result: T = this.TRANSFORMER ? this.TRANSFORMER(template) : safeDeepClone(template);

		this.CACHE.set(name, result);

		this.LOGGER.debug(`Created item: ${name}`, { source: "Factory" });

		return safeDeepClone(result);
	}

	/**
	 * Get the registry associated with this factory.
	 * @returns {IRegistry<T>} The registry instance.
	 */
	public getRegistry(): IRegistry<T> {
		return this.REGISTRY;
	}
}
