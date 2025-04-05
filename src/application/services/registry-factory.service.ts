import { IFactory, IRegistry } from '../../domain/interfaces';
import { IFactoryOptions } from '../../domain/interfaces/factory-options.interface';
import { Factory, Registry } from '../../infrastructure/implementations';

/**
 * Service that provides factory methods for creating registries and factories.
 */
export class RegistryFactoryService {
    /**
     * Creates a new registry instance.
     * @template T The type of items stored in the registry.
     * @returns A new registry instance.
     */
    public static createRegistry<T extends { name: string }>(): IRegistry<T> {
        return new Registry<T>();
    }

    /**
     * Creates a new factory instance that uses a registry as its data source.
     * @template T The type of items created by the factory.
     * @param options Factory creation options including registry and optional transformer.
     * @returns A new factory instance.
     */
    public static createFactory<T>(options: IFactoryOptions<T>): IFactory<T> {
        return new Factory<T>(options);
    }

    /**
     * Creates a factory with a registry and optional transformer in one step.
     * @template T The type of items created by the factory.
     * @param registry The registry to use as a data source.
     * @param transformer Optional function to transform items when creating.
     * @returns A new factory instance.
     */
    public static createFactoryWithRegistry<T>(
        registry: IRegistry<T>,
        transformer?: (template: T) => T
    ): IFactory<T> {
        return new Factory<T>({ registry, transformer });
    }
}
