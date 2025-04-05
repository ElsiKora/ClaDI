import { IRegistry } from '../../domain/interface/registry.interface';

/**
 * Generic registry implementation that stores items by name.
 * @template T The type of items stored in the registry.
 * @template K The type of the key used to identify items (defaults to string).
 */
export class Registry<T extends { name: string }> implements IRegistry<T> {
    private items: Map<string, T>;

    /**
     * Creates a new registry instance.
     */
    constructor() {
        this.items = new Map<string, T>();
    }

    /**
     * Register a single item in the registry.
     * @param item The item to register.
     */
    public register(item: T): void {
        this.items.set(item.name, item);
    }

    /**
     * Register multiple items in the registry.
     * @param items The items to register.
     */
    public registerMany(items: T[]): void {
        items.forEach(item => this.register(item));
    }

    /**
     * Get a single item from the registry by name.
     * @param name The name of the item to get.
     * @returns The item or undefined if it doesn't exist.
     */
    public get(name: string): T | undefined {
        return this.items.get(name);
    }

    /**
     * Get multiple items from the registry by their names.
     * @param names The names of the items to get.
     * @returns An array of items.
     */
    public getMany(names: string[]): T[] {
        return names.map(name => this.get(name)).filter((item): item is T => item !== undefined);
    }

    /**
     * Get all items from the registry.
     * @returns An array of all items.
     */
    public getAll(): T[] {
        return Array.from(this.items.values());
    }

    /**
     * Unregister a single item from the registry by name.
     * @param name The name of the item to unregister.
     */
    public unregister(name: string): void {
        this.items.delete(name);
    }

    /**
     * Unregister multiple items from the registry by their names.
     * @param names The names of the items to unregister.
     */
    public unregisterMany(names: string[]): void {
        names.forEach(name => this.unregister(name));
    }

    /**
     * Check if an item exists in the registry by name.
     * @param name The name of the item to check.
     * @returns True if the item exists, false otherwise.
     */
    public has(name: string): boolean {
        return this.items.has(name);
    }

    /**
     * Clear the registry.
     */
    public clear(): void {
        this.items.clear();
    }
}
