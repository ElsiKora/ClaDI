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
	 * @param name The name of the item to get.
	 * @returns The item or undefined if it doesn't exist.
	 */
	get(name: symbol): Set<TConstructor<T>> | T | TConstructor<T> | undefined;

	/**
	 * Get all items from the registry.
	 * @returns An array of all items.
	 */
	// eslint-disable-next-line @elsikora/sonar/use-type-alias
	getAll(): Array<Set<TConstructor<T>> | T | TConstructor<T>>;

	/**
	 * Get multiple items from the registry by their names.
	 * @param names The names of the items to get.
	 * @returns An array of items.
	 */
	getMany(names: Array<symbol>): Array<Set<TConstructor<T>> | T | TConstructor<T>>;

	/**
	 * Check if an item exists in the registry by name.
	 * @param name The name of the item to check.
	 * @returns True if the item exists, false otherwise.
	 */
	has(name: symbol): boolean;

	/**
	 * Register a single item in the registry.
	 * @param name The name of the item to register.
	 * @param item The item to register.
	 */
	register(name: symbol, item: Set<TConstructor<T>> | T | TConstructor<T>): void;

	/**
	 * Register multiple items in the registry.
	 * @param items The items to register.
	 */
	registerMany(items: Record<symbol, Set<TConstructor<T>> | T | TConstructor<T>>): void;

	/**
	 * Unregister a single item from the registry by name.
	 * @param name The name of the item to unregister.
	 */
	unregister(name: symbol): void;

	/**
	 * Unregister multiple items from the registry by their names.
	 * @param names The names of the items to unregister.
	 */
	unregisterMany(names: Array<symbol>): void;
}
