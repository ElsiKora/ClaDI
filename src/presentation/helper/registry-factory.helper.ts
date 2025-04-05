import { IFactory, IRegistry, ILogger } from '@domain/interface';
import { RegistryFactoryService } from '@application/service/registry-factory.service';

/**
 * Helper functions for creating and working with registries and factories.
 */
export class RegistryFactoryHelper {
    /**
     * Creates a registry with initial items.
     * @template T The type of items stored in the registry.
     * @param initialItems Optional array of initial items to register.
     * @param logger Optional logger to use for logging.
     * @returns A new registry instance with the initial items registered.
     */
    public static createRegistryWithItems<T extends { name: string }>(
        initialItems?: T[],
        logger?: ILogger
    ): IRegistry<T> {
        const registry = RegistryFactoryService.createRegistry<T>(logger);
        
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
     * @param logger Optional logger to use for logging.
     * @returns A new factory instance.
     */
    public static createFactory<T>(
        registry: IRegistry<T>,
        transformer?: (template: T) => T,
        logger?: ILogger
    ): IFactory<T> {
        return RegistryFactoryService.createFactoryWithRegistry(registry, transformer, logger);
    }

    /**
     * Creates a registry and factory in one step.
     * @template T The type of items in the registry and created by the factory.
     * @param items Initial items to populate the registry with.
     * @param transformer Optional function to transform items when creating from the factory.
     * @param logger Optional logger to use for logging.
     * @returns An object containing both the registry and factory.
     */
    public static createRegistryAndFactory<T extends { name: string }>(
        items: T[],
        transformer?: (template: T) => T,
        logger?: ILogger
    ): { registry: IRegistry<T>, factory: IFactory<T> } {
        const registry = RegistryFactoryHelper.createRegistryWithItems(items, logger);
        const factory = RegistryFactoryHelper.createFactory(registry, transformer, logger);
        
        return { registry, factory };
    }
    
    /**
     * Get the default logger instance from the service.
     * @returns The default logger instance.
     */
    public static getLogger(): ILogger {
        return RegistryFactoryService.getLogger();
    }
}
