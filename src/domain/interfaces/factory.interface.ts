import { IRegistry } from './registry.interface';

/**
 * Factory creation options.
 * @template T The type of items in the registry and created by the factory.
 */
export interface IFactoryOptions<T> {
    /**
     * The registry to use as a data source.
     */
    registry: IRegistry<T>;
    
    /**
     * Optional transformer function to apply when creating items.
     * @param template The template item from the registry.
     * @returns A new instance based on the template.
     */
    transformer?: (template: T) => T;
}

/**
 * Generic factory interface for creating items by name.
 * @template T The type of items created by the factory.
 */
export interface IFactory<T> {
    /**
     * Create an item by name.
     * @param name The name of the item to create.
     * @returns The created item.
     */
    create(name: string): T;
    
    /**
     * Get the registry associated with this factory.
     * @returns The registry instance.
     */
    getRegistry(): IRegistry<T>;
}
