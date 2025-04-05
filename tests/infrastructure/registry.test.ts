import { describe, it, expect, beforeEach } from 'vitest';
import { Registry } from '../../src/infrastructure/implementation';

interface TestItem {
    name: string;
    value: number;
}

describe('Registry', () => {
    let registry: Registry<TestItem>;
    let testItem1: TestItem;
    let testItem2: TestItem;

    beforeEach(() => {
        registry = new Registry<TestItem>();
        testItem1 = { name: 'item1', value: 1 };
        testItem2 = { name: 'item2', value: 2 };
    });

    it('should register a single item', () => {
        registry.register(testItem1);

        expect(registry.has(testItem1.name)).toBe(true);
        expect(registry.get(testItem1.name)).toEqual(testItem1);
    });

    it('should register multiple items', () => {
        registry.registerMany([testItem1, testItem2]);

        expect(registry.has(testItem1.name)).toBe(true);
        expect(registry.has(testItem2.name)).toBe(true);
        expect(registry.get(testItem1.name)).toEqual(testItem1);
        expect(registry.get(testItem2.name)).toEqual(testItem2);
    });

    it('should get a single item by name', () => {
        registry.register(testItem1);

        const result = registry.get(testItem1.name);

        expect(result).toEqual(testItem1);
    });

    it('should return undefined when getting a non-existent item', () => {
        const result = registry.get('non-existent');

        expect(result).toBeUndefined();
    });

    it('should get multiple items by their names', () => {
        registry.registerMany([testItem1, testItem2]);

        const results = registry.getMany([testItem1.name, testItem2.name]);

        expect(results).toHaveLength(2);
        expect(results).toContainEqual(testItem1);
        expect(results).toContainEqual(testItem2);
    });

    it('should filter out non-existent items when getting multiple items', () => {
        registry.register(testItem1);

        const results = registry.getMany([testItem1.name, 'non-existent']);

        expect(results).toHaveLength(1);
        expect(results).toContainEqual(testItem1);
    });

    it('should get all items', () => {
        registry.registerMany([testItem1, testItem2]);

        const results = registry.getAll();

        expect(results).toHaveLength(2);
        expect(results).toContainEqual(testItem1);
        expect(results).toContainEqual(testItem2);
    });

    it('should unregister a single item by name', () => {
        registry.registerMany([testItem1, testItem2]);

        registry.unregister(testItem1.name);

        expect(registry.has(testItem1.name)).toBe(false);
        expect(registry.has(testItem2.name)).toBe(true);
    });

    it('should unregister multiple items by their names', () => {
        registry.registerMany([testItem1, testItem2]);

        registry.unregisterMany([testItem1.name, testItem2.name]);

        expect(registry.has(testItem1.name)).toBe(false);
        expect(registry.has(testItem2.name)).toBe(false);
    });

    it('should check if an item exists by name', () => {
        registry.register(testItem1);

        expect(registry.has(testItem1.name)).toBe(true);
        expect(registry.has('non-existent')).toBe(false);
    });

    it('should clear the registry', () => {
        registry.registerMany([testItem1, testItem2]);

        registry.clear();

        expect(registry.has(testItem1.name)).toBe(false);
        expect(registry.has(testItem2.name)).toBe(false);
        expect(registry.getAll()).toHaveLength(0);
    });
});
