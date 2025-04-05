import { IFactory } from '@domain/interface/factory.interface';
import { IRegistry } from '@domain/interface/registry.interface';
import { IFactoryOptions } from '@domain/interface/factory-options.interface';
import { ILogger } from '@domain/interface/logger.interface';
import { RegistryItemNotFoundError } from './error.implementation';

/**
 * Generic factory implementation that creates items by name using a registry as data source.
 * @template T The type of items created by the factory.
 */
export class Factory<T> implements IFactory<T> {
    private registry: IRegistry<T>;
    private transformer?: (template: T) => T;
    private logger?: ILogger;
    private cache: Map<string, T>;

    /**
     * Creates a new factory instance.
     * @param options Factory creation options including registry, optional transformer, and logger.
     */
    constructor(options: IFactoryOptions<T>) {
        this.registry = options.registry;
        this.transformer = options.transformer;
        this.logger = options.logger;
        this.cache = new Map<string, T>();
    }



    /**
     * Create an item by name.
     * @param name The name of the item to create.
     * @returns The created item.
     * @throws RegistryItemNotFoundError if no item with the given name exists in the registry.
     */
    public create(name: string): T {
        this.logger?.debug(`Creating item: ${name}`);
        
        const cachedItem = this.cache.get(name);
        if (cachedItem) {
            this.logger?.debug(`Retrieved item from cache: ${name}`);
            return { ...cachedItem as any };
        }
        
        const template = this.registry.get(name);
        
        if (!template) {
            const error = new RegistryItemNotFoundError(name);
            this.logger?.error(`Failed to create item: ${name}`, { error });
            throw error;
        }
        
        const result = this.transformer ? this.transformer(template) : { ...template as any };
        
        this.cache.set(name, result);
        
        this.logger?.debug(`Created item: ${name}`);
        
        return { ...result as any };
    }
    
    /**
     * Clear the factory's item cache.
     * This should be called when the registry changes to ensure the factory
     * doesn't return stale items.
     * @param name Optional name of the item to clear from cache. If not provided, all items are cleared.
     */
    public clearCache(name?: string): void {
        if (name) {
            this.cache.delete(name);
            this.logger?.debug(`Cache cleared for item: ${name}`);
        } else {
            this.cache.clear();
            this.logger?.debug('Factory cache cleared');
        }
    }

    /**
     * Get the registry associated with this factory.
     * @returns The registry instance.
     */
    public getRegistry(): IRegistry<T> {
        return this.registry;
    }
}
