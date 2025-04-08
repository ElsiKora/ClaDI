import type { IContainer, IFactory, ILogger, IRegistry } from "@domain/interface";
import type { IBaseContainerOptions, IBaseFactoryOptions, IBaseRegistryOptions, IConsoleLoggerOptions } from "@infrastructure/index";
import type { ICoreFactoryOptions } from "@infrastructure/interface/core-factory-options.interface";

import { BaseContainer, BaseFactory, BaseRegistry } from "@infrastructure/class/base";
import { ConsoleLoggerService } from "@infrastructure/service";
/**
 * Factory for creating infrastructure components.
 * Provides methods to create instances of Registry, Factory, Container, and Logger.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory} for more details on factories.
 */
export class CoreFactory {
	private static instance: CoreFactory;

	private readonly LOGGER: ILogger;

	/**
	 * Creates a new infrastructure factory.
	 * @param {ICoreFactoryOptions} options - The options to use for the factory.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
	 */
	constructor(options: ICoreFactoryOptions) {
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
	}

	/**
	 * Gets the singleton instance of the InfrastructureFactory.
	 * @param {ICoreFactoryOptions} options - The options to use for the factory.
	 * @returns {CoreFactory} The singleton instance.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
	 */
	public static getInstance(options: ICoreFactoryOptions): CoreFactory {
		if (!CoreFactory.instance) {
			CoreFactory.instance = new CoreFactory(options);
		}

		return CoreFactory.instance;
	}

	/**
	 * Creates a new container instance.
	 * @param {IBaseContainerOptions} options - The options to use for the container.
	 * @returns {IContainer} A new container instance.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container}
	 */
	public createContainer(options: IBaseContainerOptions): IContainer {
		this.LOGGER?.debug("Creating new container instance", { source: "InfrastructureFactory" });

		const container: IContainer = new BaseContainer(options);

		this.LOGGER?.debug("Container instance created", { source: "InfrastructureFactory" });

		return container;
	}

	/**
	 * Creates a new factory instance.
	 * @template T The type of items created by the factory.
	 * @param {IBaseFactoryOptions<T>} options Factory creation options.
	 * @returns {IFactory<T>} A new factory instance.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
	 */
	public createFactory<T>(options: IBaseFactoryOptions<T>): IFactory<T> {
		this.LOGGER?.debug("Creating new factory instance", { source: "InfrastructureFactory" });

		const factory: IFactory<T> = new BaseFactory<T>(options);

		this.LOGGER?.debug("Factory instance created", { source: "InfrastructureFactory" });

		return factory;
	}

	/**
	 * Creates a new logger instance.
	 * @param {IConsoleLoggerOptions} options - The options to use for the logger.
	 * @returns {ILogger} A new logger instance.
	 * @see {@link https://elsikora.com/docs/cladi/services/logging}
	 */
	public createLogger(options: IConsoleLoggerOptions): ILogger {
		this.LOGGER?.debug("Creating new logger instance", {
			context: { level: options.level, loggerSource: options.source },
			source: "InfrastructureFactory",
		});

		const logger: ILogger = new ConsoleLoggerService(options);

		this.LOGGER?.debug("Logger instance created", { source: "InfrastructureFactory" });

		return logger;
	}

	/**
	 * Creates a new registry instance.
	 * @template T The type of items stored in the registry (must have a name property).
	 * @param {IBaseRegistryOptions} options - The options to use for the registry.
	 * @returns {IRegistry<T>} A new registry instance.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry}
	 */
	public createRegistry<T extends { name: string }>(options: IBaseRegistryOptions): IRegistry<T> {
		this.LOGGER?.debug("Creating new registry instance", { source: "InfrastructureFactory" });

		const registry: IRegistry<T> = new BaseRegistry<T>(options);

		this.LOGGER?.debug("Registry instance created", { source: "InfrastructureFactory" });

		return registry;
	}
}
