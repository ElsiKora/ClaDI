import type { TConstructor } from "@domain/type";

/**
 * Generic registry interface for managing items by name.
 * @template T The type of items stored in the registry.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry}
 */
export interface IRegistry<T> {
	/**
	 * Clear the registry.
	 */
	clear(): void;

	/**
	 * Get a single item from the registry by name.
	 * @param {symbol} name The name of the item to get.
	 * @returns {T | TConstructor<T> | undefined} The item or undefined if it doesn't exist.
	 */
	get(name: symbol): T | TConstructor<T> | undefined;

	/**
	 * Get all items from the registry.
	 * @returns {Array<T | TConstructor<T>>} An array of all items.
	 */
	getAll(): Array<T | TConstructor<T>>;

	/**
	 * Get multiple items from the registry by their names.
	 * @param {Array<symbol>} names The names of the items to get.
	 * @returns {Array<T | TConstructor<T>>} An array of items.
	 */
	getMany(names: Array<symbol>): Array<T | TConstructor<T>>;

	/**
	 * Check if an item exists in the registry by name.
	 * @param name The name of the item to check.
	 * @returns True if the item exists, false otherwise.
	 */
	has(name: symbol): boolean;

	/**
	 * Register a single item in the registry.
	 * @param {symbol} name The name of the item to register.
	 * @param {T | TConstructor<T>} item The item to register.
	 */
	register(name: symbol, item: T | TConstructor<T>): void;

	/**
	 * Register multiple items in the registry.
	 * @param {Record<symbol, T | TConstructor<T>>} items The items to register.
	 */
	registerMany(items: Record<symbol, T | TConstructor<T>>): void;

	/**
	 * Unregister a single item from the registry by name.
	 * @param {symbol} name The name of the item to unregister.
	 */
	unregister(name: symbol): void;

	/**
	 * Unregister multiple items from the registry by their names.
	 * @param {Array<symbol>} names The names of the items to unregister.
	 */
	unregisterMany(names: Array<symbol>): void;
}
