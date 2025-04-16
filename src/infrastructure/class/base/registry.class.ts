import type { ILogger, IRegistry } from "@domain/interface";
import type { TConstructor } from "@domain/type";
import type { IBaseRegistryOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base/error.class";
import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Generic registry implementation that stores items by name.
 * @template T The type of items stored in the registry.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry}
 */
export class BaseRegistry<T> implements IRegistry<T> {
	private readonly CACHE: Map<string, Array<T | TConstructor<T>>>;

	private readonly ITEMS: Map<string, T | TConstructor<T>>;

	private readonly LOGGER: ILogger;

	/**
	 * Creates a new registry instance.
	 * @param {IBaseRegistryOptions} options Registry creation options including logger.
	 */
	constructor(options?: IBaseRegistryOptions) {
		this.ITEMS = new Map<string, T | TConstructor<T>>();
		this.CACHE = new Map<string, Array<T | TConstructor<T>>>();
		this.LOGGER = options?.logger ?? new ConsoleLoggerService();
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
	 * @param {symbol} name The name of the item to get.
	 * @returns {TConstructor<T> | undefined} The item or undefined if it doesn't exist.
	 * @throws {BaseError} if the name is empty.
	 */
	// eslint-disable-next-line @elsikora/sonar/use-type-alias
	public get(name: symbol): T | TConstructor<T> | undefined {
		this.LOGGER.debug(`Getting item with name: ${String(name)}`, { source: "Registry" });

		if (!name) {
			this.LOGGER.warn("Attempted to get item with empty name", { source: "Registry" });

			return undefined;
		}

		const item: T | TConstructor<T> | undefined = this.ITEMS.get(String(name));

		if (item) {
			this.LOGGER.debug(`Item found: ${String(name)}`, { source: "Registry" });
		} else {
			this.LOGGER.debug(`Item not found: ${String(name)}`, { source: "Registry" });
		}

		return item;
	}

	/**
	 * Get all items from the registry.
	 * @returns {Array<T>} An array of all items.
	 */
	public getAll(): Array<T | TConstructor<T>> {
		this.LOGGER.debug("Getting all items", { source: "Registry" });

		const cacheKey: string = "getAll";
		const cachedResult: Array<T | TConstructor<T>> | undefined = this.CACHE.get(cacheKey);

		if (cachedResult) {
			this.LOGGER.debug("Cache hit for getAll query", { source: "Registry" });

			return cachedResult;
		}

		const result: Array<T | TConstructor<T>> = [...this.ITEMS.values()];

		this.CACHE.set(cacheKey, result);
		this.LOGGER.debug(`Cached result for getAll query with ${String(result.length)} items`, { source: "Registry" });

		return result;
	}

	/**
	 * Get multiple items from the registry by their names.
	 * @param {Array<symbol>} names The names of the items to get.
	 * @returns {Array<T>} An array of items.
	 * @throws {BaseError} if the names are invalid.
	 */
	public getMany(names: Array<symbol>): Array<T | TConstructor<T>> {
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

		const cacheKey: string = `getMany:${names.map(String).join(",")}`;
		const cachedResult: Array<T | TConstructor<T>> | undefined = this.CACHE.get(cacheKey);

		if (cachedResult) {
			this.LOGGER.debug(`Cache hit for query: ${cacheKey}`, { source: "Registry" });

			return cachedResult;
		}

		const result: Array<T | TConstructor<T>> = names.map((name: symbol) => this.get(name)).filter((item: T | TConstructor<T> | undefined): item is T | TConstructor<T> => item !== undefined);

		this.CACHE.set(cacheKey, result);
		this.LOGGER.debug(`Cached result for query: ${cacheKey}`, { source: "Registry" });

		return result;
	}

	/**
	 * Check if an item exists in the registry by name.
	 * @param {symbol} name The name of the item to check.
	 * @returns {boolean} True if the item exists, false otherwise.
	 */
	public has(name: symbol): boolean {
		this.LOGGER.debug(`Checking if item exists: ${String(name)}`, { source: "Registry" });

		if (!name) {
			return false;
		}

		const isExisting: boolean = this.ITEMS.has(String(name));

		this.LOGGER.debug(`Item ${isExisting ? "exists" : "does not exist"}: ${String(name)}`, { source: "Registry" });

		return isExisting;
	}

	/**
	 * Register a single item in the registry.
	 * @param {symbol} name The name of the item to register.
	 * @param {TConstructor<T>} item The item to register.
	 * @throws {BaseError} if the item is invalid.
	 */
	public register(name: symbol, item: T | TConstructor<T>): void {
		if (!item) {
			throw new BaseError("Item cannot be null or undefined", {
				code: "REGISTRY_ITEM_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Registering item with name: ${String(name)}`, { source: "Registry" });

		if (this.has(name)) {
			throw new BaseError("Item already exists in registry", {
				code: "REGISTRY_ITEM_ALREADY_EXISTS",
				context: {
					item,
					name,
				},
				source: "Registry",
			});
		}

		this.ITEMS.set(String(name), item);

		this.clearCache();

		this.LOGGER.debug(`Item registered successfully: ${String(name)}`, { source: "Registry" });
	}

	/**
	 * Register multiple items in the registry.
	 * @param {Record<symbol, TConstructor<T>>} items The items to register.
	 * @throws {BaseError} if any item is invalid.
	 */
	public registerMany(items: Record<symbol, T | TConstructor<T>>): void {
		if (!items) {
			throw new BaseError("Items cannot be null or undefined", {
				code: "REGISTRY_ITEMS_NOT_NULL_OR_UNDEFINED",
				source: "Registry",
			});
		}

		if (typeof items !== "object" || items == null || Array.isArray(items)) {
			throw new BaseError("Items must be an object", {
				code: "REGISTRY_ITEMS_NOT_OBJECT",
				source: "Registry",
			});
		}

		this.LOGGER.debug(`Registering ${String(Object.getOwnPropertySymbols(items).length)} items`, { source: "Registry" });

		for (const name of Object.getOwnPropertySymbols(items)) {
			const item: T | TConstructor<T> | undefined = items[name];

			if (item) {
				this.register(name, item);
			}
		}

		this.LOGGER.debug(`${String(Object.getOwnPropertySymbols(items).length)} items registered successfully`, { source: "Registry" });
	}

	/**
	 * Unregister a single item from the registry by name.
	 * @param {symbol} name The name of the item to unregister.
	 * @throws {BaseError} if the name is empty.
	 */
	public unregister(name: symbol): void {
		this.LOGGER.debug(`Unregistering item with name: ${String(name)}`, { source: "Registry" });

		if (!name) {
			throw new BaseError("Name cannot be empty", {
				code: "REGISTRY_NAME_NOT_EMPTY",
				source: "Registry",
			});
		}

		const wasDeleted: boolean = this.ITEMS.delete(String(name));

		this.clearCache();

		if (wasDeleted) {
			this.LOGGER.debug(`Item unregistered successfully: ${String(name)}`, { source: "Registry" });
		} else {
			this.LOGGER.debug(`Item not found for unregistering: ${String(name)}`, { source: "Registry" });
		}
	}

	/**
	 * Unregister multiple items from the registry by their names.
	 * @param {Array<symbol>} names The names of the items to unregister.
	 * @throws {BaseError} if the names are invalid.
	 */
	public unregisterMany(names: Array<symbol>): void {
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
