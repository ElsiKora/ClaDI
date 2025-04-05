import { describe, it, expect, beforeEach } from 'vitest';
import { Factory } from '../../src/infrastructure/implementations';
import { Registry } from '../../src/infrastructure/implementations';
import { IRegistry } from '../../src/domain/interfaces';

interface TestItem {
    name: string;
    value: number;
}

describe('Factory', () => {
    let registry: IRegistry<TestItem>;
    let factory: Factory<TestItem>;
    let testItem1: TestItem;
    let testItem2: TestItem;

    beforeEach(() => {
        testItem1 = { name: 'item1', value: 1 };
        testItem2 = { name: 'item2', value: 2 };
        
        registry = new Registry<TestItem>();
        registry.register(testItem1);
        
        factory = new Factory<TestItem>({ 
            registry,
            transformer: (item) => ({ ...item, value: item.value * 2 })
        });
    });

    it('should create an item by name using the registry as data source', () => {
        const result = factory.create('item1');

        expect(result).toEqual({ name: 'item1', value: 2 }); // Value doubled by transformer
    });

    it('should throw an error when creating a non-existent item', () => {
        expect(() => factory.create('non-existent')).toThrow('No item found in registry with name: non-existent');
    });

    it('should get the registry associated with the factory', () => {
        const result = factory.getRegistry();

        expect(result).toBe(registry);
    });

    it('should create items with identity transformation when no transformer is provided', () => {
        const identityFactory = new Factory<TestItem>({ registry });
        
        const result = identityFactory.create('item1');
        
        expect(result).toEqual(testItem1);
        expect(result).not.toBe(testItem1); // Should be a new object, not the same reference
    });

    it('should create items from registry that was updated after factory creation', () => {
        registry.register(testItem2);
        
        const result = factory.create('item2');
        
        expect(result).toEqual({ name: 'item2', value: 4 }); // Value doubled by transformer
    });
});
