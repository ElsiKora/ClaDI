import { describe, it, expect } from 'vitest';
import { RegistryFactoryService } from '../../src/application/service';
import { IFactory, IRegistry } from '../../src/domain/interface';
import { Registry } from '../../src/infrastructure/implementation';

interface TestItem {
    name: string;
    value: number;
}

describe('RegistryFactoryService', () => {
    it('should create a registry instance', () => {
        const registry = RegistryFactoryService.createRegistry<TestItem>();

        expect(registry).toBeDefined();
        expect(registry).toBeInstanceOf(Object);
        expect(typeof registry.register).toBe('function');
        expect(typeof registry.get).toBe('function');
        expect(typeof registry.getAll).toBe('function');
        expect(typeof registry.has).toBe('function');
        expect(typeof registry.clear).toBe('function');
    });

    it('should create a factory instance with registry', () => {
        const registry = RegistryFactoryService.createRegistry<TestItem>();
        const item = { name: 'item1', value: 1 };
        registry.register(item);
        
        const factory = RegistryFactoryService.createFactory<TestItem>({ registry });

        expect(factory).toBeDefined();
        expect(factory).toBeInstanceOf(Object);
        expect(typeof factory.create).toBe('function');
        expect(factory.getRegistry()).toBe(registry);
    });

    it('should create a factory with registry and transformer', () => {
        const registry = new Registry<TestItem>();
        const item = { name: 'item1', value: 1 };
        registry.register(item);
        
        const transformer = (template: TestItem): TestItem => ({
            ...template,
            value: template.value * 2
        });

        const factory = RegistryFactoryService.createFactory<TestItem>({ 
            registry, 
            transformer 
        });

        expect(factory).toBeDefined();
        expect(factory.create('item1')).toEqual({ name: 'item1', value: 2 });
    });
    
    it('should create a factory with registry using the convenience method', () => {
        const registry = new Registry<TestItem>();
        const item = { name: 'item1', value: 1 };
        registry.register(item);
        
        const transformer = (template: TestItem): TestItem => ({
            ...template,
            value: template.value * 3
        });

        const factory = RegistryFactoryService.createFactoryWithRegistry(registry, transformer);

        expect(factory).toBeDefined();
        expect(factory.getRegistry()).toBe(registry);
        expect(factory.create('item1')).toEqual({ name: 'item1', value: 3 });
    });
});
