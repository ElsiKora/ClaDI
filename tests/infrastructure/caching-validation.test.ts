import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Registry, Factory, ValidationError } from '../../src/infrastructure/implementation';
import { ConsoleLogger } from '../../src/infrastructure/implementation/logger.implementation';

interface TestItem {
    name: string;
    value: number;
}

describe('Registry Validation', () => {
    let registry: Registry<TestItem>;
    let logger: ConsoleLogger;

    beforeEach(() => {
        logger = new ConsoleLogger();
        vi.spyOn(logger, 'debug');
        vi.spyOn(logger, 'error');
        
        registry = new Registry<TestItem>(logger);
    });

    it('should throw ValidationError when registering null item', () => {
        expect(() => registry.register(null as any)).toThrow(ValidationError);
        expect(() => registry.register(null as any)).toThrow('Item cannot be null or undefined');
    });

    it('should throw ValidationError when registering item without name', () => {
        expect(() => registry.register({ value: 1 } as any)).toThrow(ValidationError);
        expect(() => registry.register({ value: 1 } as any)).toThrow('Item must have a name');
    });

    it('should throw ValidationError when registering item with non-string name', () => {
        expect(() => registry.register({ name: 123, value: 1 } as any)).toThrow(ValidationError);
        expect(() => registry.register({ name: 123, value: 1 } as any)).toThrow('Item name must be a string');
    });

    it('should throw ValidationError when registering many with null', () => {
        expect(() => registry.registerMany(null as any)).toThrow(ValidationError);
        expect(() => registry.registerMany(null as any)).toThrow('Items cannot be null or undefined');
    });

    it('should throw ValidationError when getting many with null', () => {
        expect(() => registry.getMany(null as any)).toThrow(ValidationError);
        expect(() => registry.getMany(null as any)).toThrow('Names cannot be null or undefined');
    });

    it('should throw ValidationError when unregistering many with null', () => {
        expect(() => registry.unregisterMany(null as any)).toThrow(ValidationError);
        expect(() => registry.unregisterMany(null as any)).toThrow('Names cannot be null or undefined');
    });

    it('should throw ValidationError when unregistering with empty name', () => {
        expect(() => registry.unregister('')).toThrow(ValidationError);
        expect(() => registry.unregister('')).toThrow('Name cannot be empty');
    });
});

describe('Registry Caching', () => {
    let registry: Registry<TestItem>;
    let logger: ConsoleLogger;
    let testItem1: TestItem;
    let testItem2: TestItem;

    beforeEach(() => {
        logger = new ConsoleLogger();
        vi.spyOn(logger, 'debug');
        
        registry = new Registry<TestItem>(logger);
        testItem1 = { name: 'item1', value: 1 };
        testItem2 = { name: 'item2', value: 2 };
        
        registry.registerMany([testItem1, testItem2]);
    });

    it('should cache getAll results', () => {
        const result1 = registry.getAll();
        expect(result1).toHaveLength(2);
        
        const result2 = registry.getAll();
        expect(result2).toHaveLength(2);
        
        expect(logger.debug).toHaveBeenCalledWith('Cache hit for getAll query');
    });

    it('should cache getMany results', () => {
        const result1 = registry.getMany(['item1', 'item2']);
        expect(result1).toHaveLength(2);
        
        const result2 = registry.getMany(['item1', 'item2']);
        expect(result2).toHaveLength(2);
        
        expect(logger.debug).toHaveBeenCalledWith('Cache hit for query: getMany:item1,item2');
    });

    it('should clear cache when registering new item', () => {
        registry.getAll();
        
        registry.register({ name: 'item3', value: 3 });
        
        expect(logger.debug).toHaveBeenCalledWith('All caches cleared');
    });

    it('should clear cache when unregistering item', () => {
        registry.getAll();
        
        registry.unregister('item1');
        
        expect(logger.debug).toHaveBeenCalledWith('All caches cleared');
    });

    it('should clear cache when clearing registry', () => {
        registry.getAll();
        
        registry.clear();
        
        expect(logger.debug).toHaveBeenCalledWith('All caches cleared');
    });
});

describe('Factory Caching', () => {
    let registry: Registry<TestItem>;
    let factory: Factory<TestItem>;
    let logger: ConsoleLogger;
    let testItem: TestItem;

    beforeEach(() => {
        logger = new ConsoleLogger();
        vi.spyOn(logger, 'debug');
        
        registry = new Registry<TestItem>(logger);
        testItem = { name: 'item1', value: 1 };
        registry.register(testItem);
        
        factory = new Factory<TestItem>({ 
            registry,
            transformer: (item) => ({ ...item, value: item.value * 2 }),
            logger
        });
    });

    it('should cache created items', () => {
        const result1 = factory.create('item1');
        expect(result1).toEqual({ name: 'item1', value: 2 });
        
        const result2 = factory.create('item1');
        expect(result2).toEqual({ name: 'item1', value: 2 });
        
        expect(logger.debug).toHaveBeenCalledWith('Retrieved item from cache: item1');
    });

    it('should clear cache when explicitly called', () => {
        factory.create('item1');
        
        factory.clearCache();
        
        expect(logger.debug).toHaveBeenCalledWith('Factory cache cleared');
        
        factory.create('item1');
        expect(logger.debug).not.toHaveBeenCalledWith('Retrieved item from cache: item1');
    });

    it('should clear specific item from cache', () => {
        factory.create('item1');
        
        factory.clearCache('item1');
        
        expect(logger.debug).toHaveBeenCalledWith('Cache cleared for item: item1');
    });
});
