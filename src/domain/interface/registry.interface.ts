/**
 * Generic registry interface for managing items by name.
 * @template T The type of items stored in the registry.
 */
export interface IRegistry<T> {
    /**
     * Register a single item in the registry.
     * @param item The item to register.
     */
    register(item: T): void;
    
    /**
     * Register multiple items in the registry.
     * @param items The items to register.
     */
    registerMany(items: T[]): void;
    
    /**
     * Get a single item from the registry by name.
     * @param name The name of the item to get.
     * @returns The item or undefined if it doesn't exist.
     */
    get(name: string): T | undefined;
    
    /**
     * Get multiple items from the registry by their names.
     * @param names The names of the items to get.
     * @returns An array of items.
     */
    getMany(names: string[]): T[];
    
    /**
     * Get all items from the registry.
     * @returns An array of all items.
     */
    getAll(): T[];
    
    /**
     * Unregister a single item from the registry by name.
     * @param name The name of the item to unregister.
     */
    unregister(name: string): void;
    
    /**
     * Unregister multiple items from the registry by their names.
     * @param names The names of the items to unregister.
     */
    unregisterMany(names: string[]): void;
    
    /**
     * Check if an item exists in the registry by name.
     * @param name The name of the item to check.
     * @returns True if the item exists, false otherwise.
     */
    has(name: string): boolean;
    
    /**
     * Clear the registry.
     */
    clear(): void;
}
