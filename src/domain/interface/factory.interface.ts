import type { IRegistry } from "./registry.interface";

/**
 * Generic factory interface for creating items by name.
 * @template T The type of items created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
 */
export interface IFactory<T> {
	/**
	 * Create an item by name.
	 * @param name The name of the item to create.
	 * @returns The created item.
	 */
	create(name: string, ...constructorArguments: Array<unknown>): T;

	/**
	 * Get the registry associated with this factory.
	 * @returns The registry instance.
	 */
	getRegistry(): IRegistry<T>;
}
