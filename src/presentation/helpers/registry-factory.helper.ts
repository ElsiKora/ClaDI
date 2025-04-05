import { IFactory, IRegistry } from '../../domain/interfaces';
import { RegistryFactoryService } from '../../application/services';

/**
 * Helper functions for creating and working with registries and factories.
 */
export class RegistryFactoryHelper {
    /**
     * Creates a registry with initial items.
     * @template T The type of items stored in the registry.
     * @param initialItems Optional array of initial items to register.
     * @returns A new registry instance with the initial items registered.
     */
    public static createRegistryWithItems<T extends { name: string }>(initialItems?: T[]): IRegistry<T> {
        const registry = RegistryFactoryService.createRegistry<T>();
        
        if (initialItems && initialItems.length > 0) {
            registry.registerMany(initialItems);
        }
        
        return registry;
    }

    /**
     * Creates a factory with a registry and transformer.
     * @template T The type of items created by the factory.
     * @param registry The registry to use as a data source.
     * @param transformer Optional function to transform items when creating.
     * @returns A new factory instance.
     */
    public static createFactory<T>(
        registry: IRegistry<T>,
        transformer?: (template: T) => T
    ): IFactory<T> {
        return RegistryFactoryService.createFactoryWithRegistry(registry, transformer);
    }

    /**
     * Creates a registry and factory in one step.
     * @template T The type of items in the registry and created by the factory.
     * @param items Initial items to populate the registry with.
     * @param transformer Optional function to transform items when creating from the factory.
     * @returns An object containing both the registry and factory.
     */
    public static createRegistryAndFactory<T extends { name: string }>(
        items: T[],
        transformer?: (template: T) => T
    ): { registry: IRegistry<T>, factory: IFactory<T> } {
        const registry = RegistryFactoryHelper.createRegistryWithItems(items);
        const factory = RegistryFactoryHelper.createFactory(registry, transformer);
        
        return { registry, factory };
    }
}
