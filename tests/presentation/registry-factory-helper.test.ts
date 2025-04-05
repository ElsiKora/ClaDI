import { describe, it, expect } from 'vitest';
import { RegistryFactoryHelper } from '../../src/presentation/helper';
import { Registry } from '../../src/infrastructure/implementation';

interface TestItem {
    name: string;
    value: number;
}

describe('RegistryFactoryHelper', () => {
    it('should create a registry with initial items', () => {
        const initialItems: TestItem[] = [
            { name: 'item1', value: 1 },
            { name: 'item2', value: 2 }
        ];

        const registry = RegistryFactoryHelper.createRegistryWithItems<TestItem>(initialItems);

        expect(registry).toBeDefined();
        expect(registry.getAll()).toHaveLength(2);
        expect(registry.get('item1')).toEqual(initialItems[0]);
        expect(registry.get('item2')).toEqual(initialItems[1]);
    });

    it('should create a registry with no items when initialItems is undefined', () => {
        const registry = RegistryFactoryHelper.createRegistryWithItems<TestItem>();

        expect(registry).toBeDefined();
        expect(registry.getAll()).toHaveLength(0);
    });

    it('should create a factory with a registry and transformer', () => {
        const registry = new Registry<TestItem>();
        const item = { name: 'item1', value: 1 };
        registry.register(item);
        
        const transformer = (template: TestItem): TestItem => ({
            name: template.name,
            value: template.value * 2
        });

        const factory = RegistryFactoryHelper.createFactory<TestItem>(registry, transformer);

        expect(factory).toBeDefined();
        expect(factory.getRegistry()).toBe(registry);
        expect(factory.create('item1')).toEqual({ name: 'item1', value: 2 });
    });

    it('should create a registry and factory in one step', () => {
        const items: TestItem[] = [
            { name: 'item1', value: 1 },
            { name: 'item2', value: 2 }
        ];
        
        const transformer = (template: TestItem): TestItem => ({
            name: template.name,
            value: template.value * 3
        });

        const { registry, factory } = RegistryFactoryHelper.createRegistryAndFactory<TestItem>(
            items,
            transformer
        );

        expect(registry).toBeDefined();
        expect(factory).toBeDefined();
        expect(registry.getAll()).toHaveLength(2);
        expect(factory.getRegistry()).toBe(registry);
        expect(factory.create('item1')).toEqual({ name: 'item1', value: 3 });
        expect(factory.create('item2')).toEqual({ name: 'item2', value: 6 });
    });
});
