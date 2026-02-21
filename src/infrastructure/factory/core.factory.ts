import type { ILogger } from "@domain/interface";
import type { IDIContainer } from "@domain/type";
import type { IConsoleLoggerOptions, ICoreFactoryOptions, IDIContainerOptions } from "@infrastructure/interface";

import { DIContainer } from "@infrastructure/class/di";
import { ConsoleLoggerService } from "@infrastructure/service";

/**
 * Factory for creating DI infrastructure components.
 */
export class CoreFactory {
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
	 * Creates a new factory instance.
	 * Useful for static composition-root bootstrap flows.
	 * @param {ICoreFactoryOptions} options - The options to use for the factory.
	 * @returns {CoreFactory} A new factory instance.
	 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory}
	 */
	public static getInstance(options: ICoreFactoryOptions): CoreFactory {
		return new CoreFactory(options);
	}

	/**
	 * Creates a new advanced DI container instance.
	 * @param {IDIContainerOptions} options - The options to use for the DI container.
	 * @returns {IDIContainer} A new advanced DI container.
	 */
	public createDIContainer(options: IDIContainerOptions = {}): IDIContainer {
		this.LOGGER?.debug("Creating new DI container instance", { source: "InfrastructureFactory" });

		const container: IDIContainer = new DIContainer(options);

		this.LOGGER?.debug("DI container instance created", { source: "InfrastructureFactory" });

		return container;
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
}
