import type { IFactory } from "@domain/interface/factory.interface";
import type { ILogger } from "@domain/interface/logger/interface";
import type { IRegistry } from "@domain/interface/registry.interface";
import type { IBaseFactoryOptions } from "@infrastructure/interface/base";

import { ConsoleLoggerService } from "@infrastructure/service";

import { BaseError } from "./error.class";

/**
 * Generic factory implementation that creates items by name using a registry as data source.
 * @template T The type of items created by the factory.
 */
export class BaseFactory<T> implements IFactory<T> {
	private readonly CACHE: Map<string, T>;

	private readonly LOGGER: ILogger;

	private readonly REGISTRY: IRegistry<T>;

	private readonly TRANSFORMER?: (template: T) => T;

	/**
	 * Creates a new factory instance.
	 * @param {IBaseFactoryOptions<T>} options Factory creation options including registry, optional transformer, and logger.
	 */
	constructor(options: IBaseFactoryOptions<T>) {
		this.REGISTRY = options.registry;
		this.TRANSFORMER = options.transformer;
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
		this.CACHE = new Map<string, T>();
	}

	/**
	 * Clear the factory's item cache.
	 * This should be called when the registry changes to ensure the factory
	 * doesn't return stale items.
	 * @param {string} [name] Optional name of the item to clear from cache. If not provided, all items are cleared.
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

			// eslint-disable-next-line @elsikora/node/no-unsupported-features/node-builtins
			return structuredClone<T>(cachedItem);
		}

		const template: T | undefined = this.REGISTRY.get(name);

		if (!template) {
			throw new BaseError("Template not found", {
				code: "TEMPLATE_NOT_FOUND",
				source: "Factory",
			});
		}

		// eslint-disable-next-line @elsikora/node/no-unsupported-features/node-builtins
		const result: T = this.TRANSFORMER ? this.TRANSFORMER(template) : structuredClone<T>(template);

		this.CACHE.set(name, result);

		this.LOGGER.debug(`Created item: ${name}`, { source: "Factory" });

		// eslint-disable-next-line @elsikora/node/no-unsupported-features/node-builtins
		return structuredClone<T>(result);
	}

	/**
	 * Get the registry associated with this factory.
	 * @returns {IRegistry<T>} The registry instance.
	 */
	public getRegistry(): IRegistry<T> {
		return this.REGISTRY;
	}
}
