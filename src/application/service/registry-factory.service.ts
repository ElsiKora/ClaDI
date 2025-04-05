import { IFactory, IRegistry, IContainer, ILogger } from '@domain/interface';
import { IFactoryOptions } from '@domain/interface/factory-options.interface';
import { 
    Factory, 
    Registry, 
    Container, 
    ConsoleLogger 
} from '@infrastructure/implementation';

/**
 * Default container instance for the service.
 */
const defaultContainer = new Container();

/**
 * Service tokens for dependency injection.
 */
export enum EServiceToken {
    LOGGER = 'logger',
    CONTAINER = 'container',
    REGISTRY = 'registry',
    FACTORY = 'factory'
}

/**
 * Service that provides factory methods for creating registries and factories.
 */
export class RegistryFactoryService {
    /**
     * Get the default container instance.
     * @returns The default container instance.
     */
    public static getContainer(): IContainer {
        return defaultContainer;
    }

    /**
     * Get or create a logger instance.
     * @param logLevel Optional log level to use if creating a new logger.
     * @returns A logger instance.
     */
    public static getLogger(): ILogger {
        const container = RegistryFactoryService.getContainer();
        
        if (!container.has(EServiceToken.LOGGER)) {
            container.register(EServiceToken.LOGGER, new ConsoleLogger());
        }
        
        return container.getRequired<ILogger>(EServiceToken.LOGGER);
    }

    /**
     * Creates a new registry instance.
     * @template T The type of items stored in the registry.
     * @param logger Optional logger to use for logging.
     * @returns A new registry instance.
     */
    public static createRegistry<T extends { name: string }>(logger?: ILogger): IRegistry<T> {
        const actualLogger = logger || RegistryFactoryService.getLogger();
        return new Registry<T>(actualLogger);
    }

    /**
     * Creates a new factory instance that uses a registry as its data source.
     * @template T The type of items created by the factory.
     * @param options Factory creation options including registry, optional transformer, and logger.
     * @returns A new factory instance.
     */
    public static createFactory<T>(options: IFactoryOptions<T>): IFactory<T> {
        if (!options.logger) {
            options = {
                ...options,
                logger: RegistryFactoryService.getLogger()
            };
        }
        
        return new Factory<T>(options);
    }

    /**
     * Creates a factory with a registry and optional transformer in one step.
     * @template T The type of items created by the factory.
     * @param registry The registry to use as a data source.
     * @param transformer Optional function to transform items when creating.
     * @param logger Optional logger to use for logging.
     * @returns A new factory instance.
     */
    public static createFactoryWithRegistry<T>(
        registry: IRegistry<T>,
        transformer?: (template: T) => T,
        logger?: ILogger
    ): IFactory<T> {
        const actualLogger = logger || RegistryFactoryService.getLogger();
        
        return new Factory<T>({ 
            registry, 
            transformer,
            logger: actualLogger
        });
    }
    
    /**
     * Register a registry in the container.
     * @template T The type of items stored in the registry.
     * @param registry The registry to register.
     * @param token Optional token to use for registration. Defaults to EServiceToken.REGISTRY.
     */
    public static registerRegistry<T>(registry: IRegistry<T>, token: string = EServiceToken.REGISTRY): void {
        const container = RegistryFactoryService.getContainer();
        container.register(token, registry);
    }
    
    /**
     * Register a factory in the container.
     * @template T The type of items created by the factory.
     * @param factory The factory to register.
     * @param token Optional token to use for registration. Defaults to EServiceToken.FACTORY.
     */
    public static registerFactory<T>(factory: IFactory<T>, token: string = EServiceToken.FACTORY): void {
        const container = RegistryFactoryService.getContainer();
        container.register(token, factory);
    }
    
    /**
     * Get a registry from the container.
     * @template T The type of items stored in the registry.
     * @param token Optional token to use for retrieval. Defaults to EServiceToken.REGISTRY.
     * @returns The registry, or undefined if it doesn't exist.
     */
    public static getRegistry<T>(token: string = EServiceToken.REGISTRY): IRegistry<T> | undefined {
        const container = RegistryFactoryService.getContainer();
        return container.get<IRegistry<T>>(token);
    }
    
    /**
     * Get a factory from the container.
     * @template T The type of items created by the factory.
     * @param token Optional token to use for retrieval. Defaults to EServiceToken.FACTORY.
     * @returns The factory, or undefined if it doesn't exist.
     */
    public static getFactory<T>(token: string = EServiceToken.FACTORY): IFactory<T> | undefined {
        const container = RegistryFactoryService.getContainer();
        return container.get<IFactory<T>>(token);
    }
}
