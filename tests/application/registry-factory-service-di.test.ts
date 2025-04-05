import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegistryFactoryService, EServiceToken } from '../../src/application/service/registry-factory.service';
import { ILogger, IRegistry, IFactory } from '../../src/domain/interface';
import { Registry, Factory, ConsoleLogger } from '../../src/infrastructure/implementation';

interface TestItem {
    name: string;
    value: number;
}

describe('RegistryFactoryService Dependency Injection', () => {
    let registry: Registry<TestItem>;
    let factory: Factory<TestItem>;
    let testItem: TestItem;

    beforeEach(() => {
        RegistryFactoryService.getContainer().clear();
        
        testItem = { name: 'test', value: 123 };
        registry = new Registry<TestItem>();
        registry.register(testItem);
        
        factory = new Factory<TestItem>({ registry });
    });

    afterEach(() => {
        RegistryFactoryService.getContainer().clear();
    });

    it('should get the default container instance', () => {
        const container = RegistryFactoryService.getContainer();
        
        expect(container).toBeDefined();
        expect(container.has(EServiceToken.LOGGER)).toBe(false);
    });

    it('should get or create a logger instance', () => {
        const logger = RegistryFactoryService.getLogger();
        
        expect(logger).toBeDefined();
        expect(logger).toBeInstanceOf(ConsoleLogger);
        
        const logger2 = RegistryFactoryService.getLogger();
        expect(logger2).toBe(logger);
    });

    it('should register and get a registry', () => {
        RegistryFactoryService.registerRegistry(registry);
        
        const retrievedRegistry = RegistryFactoryService.getRegistry<TestItem>();
        
        expect(retrievedRegistry).toBeDefined();
        expect(retrievedRegistry).toBe(registry);
    });

    it('should register and get a factory', () => {
        RegistryFactoryService.registerFactory(factory);
        
        const retrievedFactory = RegistryFactoryService.getFactory<TestItem>();
        
        expect(retrievedFactory).toBeDefined();
        expect(retrievedFactory).toBe(factory);
    });

    it('should register with custom token and get by that token', () => {
        const customToken = 'custom-registry';
        RegistryFactoryService.registerRegistry(registry, customToken);
        
        const retrievedRegistry = RegistryFactoryService.getRegistry<TestItem>(customToken);
        
        expect(retrievedRegistry).toBeDefined();
        expect(retrievedRegistry).toBe(registry);
        
        const defaultRegistry = RegistryFactoryService.getRegistry<TestItem>();
        expect(defaultRegistry).toBeUndefined();
    });

    it('should create registry with logger', () => {
        const logger = RegistryFactoryService.getLogger();
        const newRegistry = RegistryFactoryService.createRegistry<TestItem>(logger);
        
        expect(newRegistry).toBeDefined();
        expect(newRegistry).toBeInstanceOf(Registry);
    });

    it('should create factory with registry and logger', () => {
        const logger = RegistryFactoryService.getLogger();
        const newFactory = RegistryFactoryService.createFactoryWithRegistry<TestItem>(registry, undefined, logger);
        
        expect(newFactory).toBeDefined();
        expect(newFactory).toBeInstanceOf(Factory);
        expect(newFactory.getRegistry()).toBe(registry);
    });
});
