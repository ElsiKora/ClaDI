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
