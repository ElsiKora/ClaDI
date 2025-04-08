import type { ILogger, IRegistry } from "@domain/interface";
import type { IBaseRegistryOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base/error.class";
import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Generic registry implementation that stores items by name.
 * @template T The type of items stored in the registry.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry}
 */
export class BaseRegistry<T extends { getName(): string }> implements IRegistry<T> {
	private readonly CACHE: Map<string, Array<T>>;

	private readonly ITEMS: Map<string, T>;

	private readonly LOGGER: ILogger;

	/**
	 * Creates a new registry instance.
	 * @param {IBaseRegistryOptions} options Registry creation options including logger.
	 */
	constructor(options: IBaseRegistryOptions) {
		this.ITEMS = new Map<string, T>();
		this.CACHE = new Map<string, Array<T>>();
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
	}

	/**
	 * Clear the registry.
	 */
	public clear(): void {
		this.LOGGER.debug("Clearing registry", { source: "Registry" });

		this.ITEMS.clear();
		this.clearCache();

		this.LOGGER.debug("Registry cleared", { source: "Registry" });
	}

	/**
	 * Get a single item from the registry by name.
	 * @param {string} name The name of the item to get.
	 * @returns {T | undefined} The item or undefined if it doesn't exist.
	 */
	public get(name: string): T | undefined {
		this.LOGGER.debug(`Getting item with name: ${name}`, { source: "Registry" });

		if (!name) {
			this.LOGGER.warn("Attempted to get item with empty name", { source: "Registry" });

			return undefined;
		}

		const item: T | undefined = this.ITEMS.get(name);

		if (item) {
			this.LOGGER.debug(`Item found: ${name}`, { source: "Registry" });
		} else {
			this.LOGGER.debug(`Item not found: ${name}`, { source: "Registry" });
		}

		return item;
	}

	/**
	 * Get all items from the registry.
	 * @returns {Array<T>} An array of all items.
	 */
	public getAll(): Array<T> {
		this.LOGGER.debug("Getting all items", { source: "Registry" });

		const cacheKey: string = "getAll";
		const cachedResult: Array<T> | undefined = this.CACHE.get(cacheKey);

		if (cachedResult) {
			this.LOGGER.debug("Cache hit for getAll query", { source: "Registry" });

			return cachedResult;
		}

		const result: Array<T> = [...this.ITEMS.values()];

		this.CACHE.set(cacheKey, result);
		this.LOGGER.debug(`Cached result for getAll query with ${String(result.length)} items`, { source: "Registry" });

		return result;
	}

	/**
	 * Get multiple items from the registry by their names.
	 * @param {Array<string>} names The names of the items to get.
	 * @returns {Array<T>} An array of items.
	 */
	public getMany(names: Array<string>): Array<T> {
		if (!names) {
			throw new BaseError("Names cannot be null or undefined", {
				code: "REGISTRY_NAMES_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		if (!Array.isArray(names)) {
			throw new BaseError("Names must be an array", {
				code: "REGISTRY_NAMES_NOT_ARRAY",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Getting ${String(names.length)} items by name`, { source: "Registry" });

		const cacheKey: string = `getMany:${names.join(",")}`;
		const cachedResult: Array<T> | undefined = this.CACHE.get(cacheKey);

		if (cachedResult) {
			this.LOGGER.debug(`Cache hit for query: ${cacheKey}`, { source: "Registry" });

			return cachedResult;
		}

		const result: Array<T> = names.map((name: string) => this.get(name)).filter((item: T | undefined): item is T => item !== undefined);

		this.CACHE.set(cacheKey, result);
		this.LOGGER.debug(`Cached result for query: ${cacheKey}`, { source: "Registry" });

		return result;
	}

	/**
	 * Check if an item exists in the registry by name.
	 * @param {string} name The name of the item to check.
	 * @returns {boolean} True if the item exists, false otherwise.
	 */
	public has(name: string): boolean {
		this.LOGGER.debug(`Checking if item exists: ${name}`, { source: "Registry" });

		if (!name) {
			return false;
		}

		const isExisting: boolean = this.ITEMS.has(name);

		this.LOGGER.debug(`Item ${isExisting ? "exists" : "does not exist"}: ${name}`, { source: "Registry" });

		return isExisting;
	}

	/**
	 * Register a single item in the registry.
	 * @param {T} item The item to register.
	 * @throws ValidationError if the item is invalid.
	 */
	public register(item: T): void {
		if (!item) {
			throw new BaseError("Item cannot be null or undefined", {
				code: "REGISTRY_ITEM_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Registering item with name: ${item.getName()}`, { source: "Registry" });

		if (this.has(item.getName())) {
			throw new BaseError("Item already exists in registry", {
				code: "REGISTRY_ITEM_ALREADY_EXISTS",
				source: "Registry",
			});
		}

		this.ITEMS.set(item.getName(), item);

		this.clearCache();

		this.LOGGER.debug(`Item registered successfully: ${item.getName()}`, { source: "Registry" });
	}

	/**
	 * Register multiple items in the registry.
	 * @param {Array<T>} items The items to register.
	 * @throws ValidationError if any item is invalid.
	 */
	public registerMany(items: Array<T>): void {
		if (!items) {
			throw new BaseError("Items cannot be null or undefined", {
				code: "REGISTRY_ITEMS_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		if (!Array.isArray(items)) {
			throw new BaseError("Items must be an array", {
				code: "REGISTRY_ITEMS_NOT_ARRAY",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Registering ${String(items.length)} items`, { source: "Registry" });

		for (const item of items) {
			this.register(item);
		}

		this.LOGGER.debug(`${String(items.length)} items registered successfully`, { source: "Registry" });
	}

	/**
	 * Unregister a single item from the registry by name.
	 * @param {string} name The name of the item to unregister.
	 */
	public unregister(name: string): void {
		this.LOGGER.debug(`Unregistering item with name: ${name}`, { source: "Registry" });

		if (!name) {
			throw new BaseError("Name cannot be empty", {
				code: "REGISTRY_NAME_NOT_EMPTY",
				source: "Registry",
			});
		}

		const wasDeleted: boolean = this.ITEMS.delete(name);

		this.clearCache();

		if (wasDeleted) {
			this.LOGGER.debug(`Item unregistered successfully: ${name}`, { source: "Registry" });
		} else {
			this.LOGGER.debug(`Item not found for unregistering: ${name}`, { source: "Registry" });
		}
	}

	/**
	 * Unregister multiple items from the registry by their names.
	 * @param {Array<string>} names The names of the items to unregister.
	 */
	public unregisterMany(names: Array<string>): void {
		if (!names) {
			throw new BaseError("Names cannot be null or undefined", {
				code: "REGISTRY_NAMES_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		if (!Array.isArray(names)) {
			throw new BaseError("Names must be an array", {
				code: "REGISTRY_NAMES_NOT_ARRAY",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Unregistering ${String(names.length)} items`, { source: "Registry" });

		for (const name of names) {
			this.unregister(name);
		}

		this.LOGGER.debug(`${String(names.length)} items unregistered`, { source: "Registry" });
	}

	/**
	 * Clear the cache for a specific query or all caches if no query is provided.
	 * @param {string} [cacheKey] Optional cache key to clear. If not provided, all caches are cleared.
	 */
	private clearCache(cacheKey?: string): void {
		if (cacheKey) {
			this.CACHE.delete(cacheKey);
			this.LOGGER.debug(`Cache cleared for key: ${cacheKey}`, { source: "Registry" });
		} else {
			this.CACHE.clear();
			this.LOGGER.debug("All caches cleared", { source: "Registry" });
		}
	}
}
