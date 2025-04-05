import { IFactory, IFactoryOptions, IRegistry } from '../../domain/interfaces';

/**
 * Generic factory implementation that creates items by name using a registry as data source.
 * @template T The type of items created by the factory.
 */
export class Factory<T> implements IFactory<T> {
    private registry: IRegistry<T>;
    private transformer?: (template: T) => T;

    /**
     * Creates a new factory instance.
     * @param options Factory creation options including registry and optional transformer.
     */
    constructor(options: IFactoryOptions<T>) {
        this.registry = options.registry;
        this.transformer = options.transformer;
    }

    /**
     * Create an item by name.
     * @param name The name of the item to create.
     * @returns The created item.
     * @throws Error if no item with the given name exists in the registry.
     */
    public create(name: string): T {
        const template = this.registry.get(name);
        
        if (!template) {
            throw new Error(`No item found in registry with name: ${name}`);
        }
        
        return this.transformer ? this.transformer(template) : { ...template as any };
    }

    /**
     * Get the registry associated with this factory.
     * @returns The registry instance.
     */
    public getRegistry(): IRegistry<T> {
        return this.registry;
    }
}
