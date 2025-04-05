import { IRegistry } from '@domain/interface/registry.interface';
import { ILogger } from '@domain/interface/logger.interface';
import { ValidationError } from './error.implementation';

/**
 * Generic registry implementation that stores items by name.
 * @template T The type of items stored in the registry.
 */
export class Registry<T extends { name: string }> implements IRegistry<T> {
    private items: Map<string, T>;
    private cache: Map<string, T[]>;
    private logger?: ILogger;

    /**
     * Creates a new registry instance.
     * @param logger Optional logger to use for logging.
     */
    constructor(logger?: ILogger) {
        this.items = new Map<string, T>();
        this.cache = new Map<string, T[]>();
        this.logger = logger;
    }

    /**
     * Validate an item before registering it.
     * @param item The item to validate.
     * @throws ValidationError if the item is invalid.
     */
    private validateItem(item: T): void {
        if (!item) {
            throw new ValidationError('Item cannot be null or undefined');
        }
        
        if (!item.name) {
            throw new ValidationError('Item must have a name');
        }
        
        if (typeof item.name !== 'string') {
            throw new ValidationError('Item name must be a string');
        }
    }

    /**
     * Clear the cache for a specific query or all caches if no query is provided.
     * @param cacheKey Optional cache key to clear. If not provided, all caches are cleared.
     */
    private clearCache(cacheKey?: string): void {
        if (cacheKey) {
            this.cache.delete(cacheKey);
            this.logger?.debug(`Cache cleared for key: ${cacheKey}`);
        } else {
            this.cache.clear();
            this.logger?.debug('All caches cleared');
        }
    }

    /**
     * Register a single item in the registry.
     * @param item The item to register.
     * @throws ValidationError if the item is invalid.
     */
    public register(item: T): void {
        this.logger?.debug(`Registering item with name: ${item?.name}`, { item });
        
        this.validateItem(item);
        this.items.set(item.name, item);
        
        this.clearCache();
        
        this.logger?.debug(`Item registered successfully: ${item.name}`);
    }

    /**
     * Register multiple items in the registry.
     * @param items The items to register.
     * @throws ValidationError if any item is invalid.
     */
    public registerMany(items: T[]): void {
        if (!items) {
            throw new ValidationError('Items cannot be null or undefined');
        }
        
        if (!Array.isArray(items)) {
            throw new ValidationError('Items must be an array');
        }
        
        this.logger?.debug(`Registering ${items.length} items`);
        
        items.forEach(item => this.register(item));
        
        this.logger?.debug(`${items.length} items registered successfully`);
    }

    /**
     * Get a single item from the registry by name.
     * @param name The name of the item to get.
     * @returns The item or undefined if it doesn't exist.
     */
    public get(name: string): T | undefined {
        this.logger?.debug(`Getting item with name: ${name}`);
        
        if (!name) {
            this.logger?.warn('Attempted to get item with empty name');
            return undefined;
        }
        
        const item = this.items.get(name);
        
        if (item) {
            this.logger?.debug(`Item found: ${name}`);
        } else {
            this.logger?.debug(`Item not found: ${name}`);
        }
        
        return item;
    }

    /**
     * Get multiple items from the registry by their names.
     * @param names The names of the items to get.
     * @returns An array of items.
     */
    public getMany(names: string[]): T[] {
        if (!names) {
            throw new ValidationError('Names cannot be null or undefined');
        }
        
        if (!Array.isArray(names)) {
            throw new ValidationError('Names must be an array');
        }
        
        this.logger?.debug(`Getting ${names.length} items by name`);
        
        const cacheKey = `getMany:${names.join(',')}`;
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
            this.logger?.debug(`Cache hit for query: ${cacheKey}`);
            return cachedResult;
        }
        
        const result = names
            .map(name => this.get(name))
            .filter((item): item is T => item !== undefined);
        
        this.cache.set(cacheKey, result);
        this.logger?.debug(`Cached result for query: ${cacheKey}`);
        
        return result;
    }

    /**
     * Get all items from the registry.
     * @returns An array of all items.
     */
    public getAll(): T[] {
        this.logger?.debug('Getting all items');
        
        const cacheKey = 'getAll';
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
            this.logger?.debug('Cache hit for getAll query');
            return cachedResult;
        }
        
        const result = Array.from(this.items.values());
        
        this.cache.set(cacheKey, result);
        this.logger?.debug(`Cached result for getAll query with ${result.length} items`);
        
        return result;
    }

    /**
     * Unregister a single item from the registry by name.
     * @param name The name of the item to unregister.
     */
    public unregister(name: string): void {
        this.logger?.debug(`Unregistering item with name: ${name}`);
        
        if (!name) {
            throw new ValidationError('Name cannot be empty');
        }
        
        const deleted = this.items.delete(name);
        
        this.clearCache();
        
        if (deleted) {
            this.logger?.debug(`Item unregistered successfully: ${name}`);
        } else {
            this.logger?.debug(`Item not found for unregistering: ${name}`);
        }
    }

    /**
     * Unregister multiple items from the registry by their names.
     * @param names The names of the items to unregister.
     */
    public unregisterMany(names: string[]): void {
        if (!names) {
            throw new ValidationError('Names cannot be null or undefined');
        }
        
        if (!Array.isArray(names)) {
            throw new ValidationError('Names must be an array');
        }
        
        this.logger?.debug(`Unregistering ${names.length} items`);
        
        names.forEach(name => this.unregister(name));
        
        this.logger?.debug(`${names.length} items unregistered`);
    }

    /**
     * Check if an item exists in the registry by name.
     * @param name The name of the item to check.
     * @returns True if the item exists, false otherwise.
     */
    public has(name: string): boolean {
        this.logger?.debug(`Checking if item exists: ${name}`);
        
        if (!name) {
            return false;
        }
        
        const exists = this.items.has(name);
        
        this.logger?.debug(`Item ${exists ? 'exists' : 'does not exist'}: ${name}`);
        
        return exists;
    }

    /**
     * Clear the registry.
     */
    public clear(): void {
        this.logger?.debug('Clearing registry');
        
        this.items.clear();
        this.clearCache();
        
        this.logger?.debug('Registry cleared');
    }
}
