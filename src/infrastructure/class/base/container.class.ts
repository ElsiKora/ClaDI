import type { IContainer, IContainerDynamicFactoryResolutionContext, ILogger } from "@domain/interface";
import type { TConstructor, TContainerDynamicFactory } from "@domain/type";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base/error.class";
import { containerRegistry } from "@infrastructure/registry";
import { ConsoleLoggerService } from "@infrastructure/service";
import { DECORATOR_TOKENS_CONSTANT } from "@presentation/constant";

import "reflect-metadata";

/**
 * Simple dependency injection container implementation.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container}
 */
export class BaseContainer implements IContainer {
	private readonly DEPENDENCIES: Map<symbol, unknown>;

	private readonly LOGGER: ILogger;

	/**
	 * Create a new container.
	 * @param {IBaseContainerOptions} options - The options to use for the container.
	 */
	constructor(options: IBaseContainerOptions) {
		this.DEPENDENCIES = new Map<symbol, unknown>();
		this.LOGGER = options?.logger ?? new ConsoleLoggerService();

		containerRegistry.register(options.name, this);
	}

	/**
	 * Clear all dependencies from the container.
	 */
	public clear(): void {
		this.LOGGER.debug("Clearing all dependencies from container", { source: "Container" });
		this.DEPENDENCIES.clear();
		this.LOGGER.debug("Container cleared successfully", { source: "Container" });
	}

	/**
	 * Get a dependency from the container.
	 * Handles pre-registered instances, resolvable constructors (@Injectable),
	 * and dynamic factory functions.
	 * Resolution results (constructors, factories) are cached (singleton scope).
	 * @param {symbol} token Token that identifies the dependency.
	 * @returns {T} The dependency instance or value.
	 * @template T The type of the dependency.
	 * @throws {BaseError} If the token is invalid, dependency not found, or resolution/factory execution fails.
	 */

	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public get<T>(token: symbol): T {
		if (!token) {
			throw new BaseError("Token cannot be null or undefined", {
				code: "CONTAINER_TOKEN_NOT_NULL_OR_UNDEFINED",
				source: "Container",
			});
		}

		this.LOGGER.debug(`Getting dependency with token: ${String(token.description)}`, { source: "Container" });

		const registeredValue: unknown = this.DEPENDENCIES.get(token);

		if (registeredValue === undefined) {
			this.LOGGER.warn(`Dependency not found for token "${String(token.description)}"`, { source: "Container" });

			throw new BaseError(`Dependency not found for token "${String(token.description)}"`, {
				code: "CONTAINER_DEPENDENCY_NOT_FOUND",
				context: { token: String(token.description) },
				source: "Container",
			});
		}

		if (typeof registeredValue === "function" && registeredValue.prototype && Reflect.hasMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, registeredValue as object)) {
			const injectableConstructor: TConstructor<T> = registeredValue as TConstructor<T>;
			this.LOGGER.debug(`Token ${String(token.description)} corresponds to an injectable constructor ${injectableConstructor.name}. Resolving...`, { source: "Container" });

			try {
				const instance: T = this.resolve(injectableConstructor);
				this.DEPENDENCIES.set(token, instance);
				this.LOGGER.debug(`Resolved and cached instance for token ${String(token.description)}`, { source: "Container" });

				return instance;
			} catch (error) {
				this.LOGGER.error(`Failed to resolve constructor for token ${String(token.description)}: ${error instanceof Error ? error.message : String(error)}`, { source: "Container" });

				throw new BaseError(`Failed to resolve dependency for token "${String(token.description)}"`, {
					cause: error instanceof Error ? error : undefined,
					code: "CONTAINER_DEPENDENCY_RESOLUTION_FAILED",
					context: { token: String(token.description) },
					source: "Container",
				});
			}
		} else if (typeof registeredValue === "function" && !registeredValue.prototype) {
			const factory: TContainerDynamicFactory<T> = registeredValue as TContainerDynamicFactory<T>;
			this.LOGGER.debug(`Token ${String(token.description)} corresponds to a dynamic factory. Executing...`, { source: "Container" });

			try {
				const context: IContainerDynamicFactoryResolutionContext = { container: this };
				const instance: T = factory(context);
				this.DEPENDENCIES.set(token, instance);
				this.LOGGER.debug(`Executed factory and cached instance for token ${String(token.description)}`, { source: "Container" });

				return instance;
			} catch (error) {
				this.LOGGER.error(`Failed to execute factory for token ${String(token.description)}: ${error instanceof Error ? error.message : String(error)}`, { source: "Container" });

				throw new BaseError(`Failed to create dependency from factory for token ${String(token.description)}`, {
					cause: error instanceof Error ? error : undefined,
					code: "CONTAINER_FACTORY_EXECUTION_FAILED",
					context: { token: String(token.description) },
					source: "Container",
				});
			}
		} else {
			this.LOGGER.debug(`Dependency found directly (pre-registered instance/value) for token: ${String(token.description)}`, { source: "Container" });

			return registeredValue as T;
		}
	}

	/**
	 * Get all dependencies from the container.
	 * @returns {Array<unknown>} An array of all dependencies.
	 */
	public getAll<T>(): Array<T> {
		this.LOGGER.debug("Getting all dependencies", { source: "Container" });

		const dependencies: Array<unknown> = [...this.DEPENDENCIES.values()].filter((value: unknown) => {
			const isInjectableConstructor: boolean = typeof value === "function" && !!value.prototype && Reflect.hasMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, value);

			return !isInjectableConstructor;
		});
		this.LOGGER.debug(`Retrieved ${String(dependencies.length)} direct dependencies (excluding unresolved constructors)`, { source: "Container" });

		return dependencies as Array<T>;
	}

	/**
	 * Get multiple dependencies from the container.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 * @returns {Array<unknown>} An array of dependencies.
	 */
	public getMany<T>(tokens: Array<symbol>): Array<T> {
		if (!tokens) {
			throw new BaseError("Tokens cannot be null or undefined", {
				code: "CONTAINER_TOKENS_NOT_NULL_OR_UNDEFINED",
				context: {
					tokens,
				},
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
				context: {
					tokens,
				},
				source: "Container",
			});
		}

		this.LOGGER.debug(`Getting ${String(tokens.length)} dependencies by token`, { source: "Container" });

		const result: Array<T> = tokens.map((token: symbol) => this.get<T>(token)).filter((item: T | undefined): item is T => item !== undefined);

		this.LOGGER.debug(`Retrieved ${String(result.length)} dependencies`, { source: "Container" });

		return result;
	}

	/**
	 * Check if a dependency exists in the container.
	 * @param {symbol} token Token that identifies the dependency.
	 * @returns {boolean} True if the dependency exists, false otherwise.
	 */
	public has(token: symbol): boolean {
		if (!token) {
			return false;
		}

		this.LOGGER.debug(`Checking if dependency exists: ${String(token.description)}`, { source: "Container" });

		const isExists: boolean = this.DEPENDENCIES.has(token);

		this.LOGGER.debug(`Dependency ${isExists ? "exists" : "does not exist"}: ${String(token.description)}`, { source: "Container" });

		return isExists;
	}

	/**
	 * Register a dependency instance, value, constructor, or factory function.
	 * @param {symbol} token Token that identifies the dependency.
	 * @param {T | TConstructor<T> | TContainerDynamicFactory<T>} implementation Instance, constructor, or factory.
	 * @template T The type of the dependency.
	 */

	public register<T>(token: symbol, implementation: T | TConstructor<T> | TContainerDynamicFactory<T>): void {
		if (!token) {
			throw new BaseError("Token cannot be null or undefined", {
				code: "CONTAINER_TOKEN_NOT_NULL_OR_UNDEFINED",
				source: "Container",
			});
		}

		let valueType: string = "instance or value";

		if (typeof implementation === "function") {
			if (implementation.prototype && Reflect.hasMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, implementation as object)) {
				valueType = "injectable constructor";
			} else if (implementation.prototype) {
				valueType = "non-injectable constructor or simple function";
			} else {
				valueType = "dynamic factory";
			}
		}
		this.LOGGER.debug(`Registering ${valueType} with token: ${String(token.description)}`, { source: "Container" });

		if (this.has(token)) {
			throw new BaseError(`Dependency already exists in container for token "${String(token.description)}"`, {
				code: "CONTAINER_DEPENDENCY_ALREADY_EXISTS",
				context: { token: String(token.description) },
				source: "Container",
			});
		}

		this.DEPENDENCIES.set(token, implementation);

		this.LOGGER.debug(`Dependency registered successfully: ${String(token.description)}`, { source: "Container" });
	}

	/**
	 * Register multiple dependencies.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 * @param {Record<symbol, T | TConstructor<T> | TContainerDynamicFactory<T>>} implementations Map of tokens to instances, constructors, or factories.
	 * @template T The type of the dependency.
	 */
	public registerMany<T>(tokens: Array<symbol>, implementations: Record<symbol, T | TConstructor<T> | TContainerDynamicFactory<T>>): void {
		if (!tokens) {
			throw new BaseError("Tokens cannot be null or undefined", {
				code: "CONTAINER_TOKENS_NOT_NULL_OR_UNDEFINED",
				context: { tokens },
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
				context: { tokens },
				source: "Container",
			});
		}

		if (typeof implementations !== "object" || implementations == null || Array.isArray(implementations)) {
			throw new BaseError("Implementations must be a non-null object", {
				code: "CONTAINER_IMPLEMENTATIONS_NOT_OBJECT",
				context: { implementations },
				source: "Container",
			});
		}

		this.LOGGER.debug(`Attempting to register ${String(tokens.length)} dependencies`, { source: "Container" });

		let registeredCount: number = 0;

		// eslint-disable-next-line @elsikora/no-secrets/no-pattern-match
		for (const token of tokens) {
			if (Object.prototype.hasOwnProperty.call(implementations, token)) {
				try {
					this.register(token, implementations[token]);
					registeredCount++;
				} catch (error) {
					this.LOGGER.error(`Failed to register dependency for token ${String(token.description)}: ${error instanceof Error ? error.message : String(error)}`, { context: { error }, source: "Container" });
				}
			} else {
				this.LOGGER.warn(`Token ${String(token.description)} provided in tokens array but missing in implementations object. Skipping.`, { source: "Container" });
			}
		}

		this.LOGGER.debug(`${String(registeredCount)} dependencies were registered (or attempted)`, { source: "Container" });
	}

	/**
	 * Resolves and instantiates a class constructor, injecting dependencies based on @Inject metadata.
	 * The class must be decorated with @Injectable to determine the correct container.
	 * Note: This method performs the core resolution logic and is called by `get` when needed.
	 * @template T The type of the class to resolve.
	 * @param {TConstructor<T>} constructor The class constructor to instantiate.
	 * @returns {T} The instantiated class instance with dependencies injected.
	 * @throws {BaseError} If the class is not injectable, the container is not found, or dependencies cannot be resolved.
	 */
	public resolve<T>(constructor: TConstructor<T>): T {
		this.LOGGER.debug(`Resolving class: ${constructor.name}`, { source: "Container" });
		const containerName: symbol | undefined = Reflect.getMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, constructor) as symbol | undefined;

		if (typeof containerName !== "symbol") {
			throw new BaseError(`Class ${constructor.name} is not marked as @Injectable or container name metadata is invalid.`, {
				code: "CONTAINER_CLASS_NOT_INJECTABLE",
				context: { className: constructor.name },
				source: "Container",
			});
		}

		const targetContainer: IContainer | undefined = containerRegistry.get(containerName) as IContainer | undefined;

		if (!targetContainer) {
			throw new BaseError(`Container with name "${String(containerName.description)}" not found for resolving ${constructor.name}. Ensure this container is created before resolving dependents.`, {
				code: "CONTAINER_INSTANCE_NOT_FOUND",
				context: { className: constructor.name, containerName: String(containerName.description) },
				source: "Container",
			});
		}

		const injectionMap: unknown = Reflect.getMetadata(DECORATOR_TOKENS_CONSTANT.INJECT_TOKEN_KEY, constructor);
		const constructorParameters: unknown = (Reflect.getMetadata("design:paramtypes", constructor) as unknown) ?? [];

		if (Array.isArray(constructorParameters) && constructorParameters.length === 0 && injectionMap instanceof Map && injectionMap.size > 0) {
			this.LOGGER.warn(`Constructor parameters metadata missing for ${constructor.name}, but injectionMap exists with ${String(injectionMap.size)} entries. Using injectionMap for dependency resolution.`, { source: "Container" });

			const mapKeys: Array<number> = [...injectionMap.keys()] as Array<number>;
			const parameterCount: number = Math.max(...mapKeys) + 1;
			const resolvedArguments: Array<unknown> = Array.from({ length: parameterCount });

			const validInjectionMap: Map<number, symbol> = injectionMap as Map<number, symbol>;

			for (const [index, injectionToken] of validInjectionMap.entries()) {
				this.LOGGER.debug(`Resolving dependency for param ${String(index)} of ${constructor.name} using token: ${String(injectionToken.description)}`, { source: "Container" });

				try {
					resolvedArguments[index] = targetContainer.get.call(targetContainer, injectionToken);
				} catch (error) {
					this.LOGGER.error(`Failed to get dependency for token ${String(injectionToken.description)} from container ${String(containerName.description)} while resolving ${constructor.name}`, { context: { error }, source: "Container" });

					throw new BaseError(`Failed to resolve dependency [${String(injectionToken.description)}] for parameter ${String(index)} of class ${constructor.name}.`, {
						cause: error instanceof Error ? error : undefined,
						code: "CONTAINER_DEPENDENCY_RESOLUTION_FAILED",
						context: {
							className: constructor.name,
							dependencyToken: String(injectionToken.description),
							parameterIndex: index,
							targetContainer: String(containerName.description),
						},
						source: "Container",
					});
				}
			}

			this.LOGGER.debug(`Instantiating ${constructor.name} with ${String(resolvedArguments.length)} resolved arguments from injectionMap.`, { source: "Container" });

			try {
				const instance: T = new constructor(...resolvedArguments);
				this.LOGGER.info(`Successfully resolved and instantiated ${constructor.name}.`, { source: "Container" });

				return instance;
			} catch (error) {
				this.LOGGER.error(`Error during instantiation of ${constructor.name}: ${error instanceof Error ? error.message : String(error)}`, { context: { error }, source: "Container" });

				throw new BaseError(`Failed to instantiate class ${constructor.name}. Check constructor implementation.`, {
					cause: error instanceof Error ? error : undefined,
					code: "CONTAINER_INSTANTIATION_FAILED",
					context: { className: constructor.name },
					source: "Container",
				});
			}
		}

		if (!Array.isArray(constructorParameters)) {
			throw new BaseError(`Failed to retrieve constructor parameter types for ${constructor.name}. Ensure 'emitDecoratorMetadata' is true in tsconfig.`, {
				code: "CONTAINER_METADATA_ERROR",
				context: { className: constructor.name },
				source: "Container",
			});
		}

		const isInjectionMapValid: boolean = injectionMap instanceof Map && [...injectionMap.entries()].every(([key, value]: [number, symbol]) => typeof key === "number" && typeof value === "symbol");

		const resolvedArguments: Array<unknown> = [];

		if (isInjectionMapValid) {
			const validInjectionMap: Map<number, symbol> = injectionMap as Map<number, symbol>;

			for (let index: number = 0; index < constructorParameters.length; index++) {
				const injectionToken: symbol | undefined = validInjectionMap.get(index);

				if (injectionToken) {
					this.LOGGER.debug(`Resolving dependency for param ${String(index)} of ${constructor.name} using token: ${String(injectionToken.description)}`, { source: "Container" });

					try {
						resolvedArguments[index] = targetContainer.get.call(targetContainer, injectionToken);
					} catch (error) {
						this.LOGGER.error(`Failed to get dependency for token ${String(injectionToken.description)} from container ${String(containerName.description)} while resolving ${constructor.name}`, { context: { error }, source: "Container" });

						throw new BaseError(`Failed to resolve dependency [${String(injectionToken.description)}] for parameter ${String(index)} of class ${constructor.name}.`, {
							cause: error instanceof Error ? error : undefined,
							code: "CONTAINER_DEPENDENCY_RESOLUTION_FAILED",
							context: {
								className: constructor.name,
								dependencyToken: String(injectionToken.description),
								parameterIndex: index,
								targetContainer: String(containerName.description),
							},
							source: "Container",
						});
					}
				} else {
					throw new BaseError(`Constructor parameter at index ${String(index)} for class ${constructor.name} is not marked with @Inject. All constructor parameters must be decorated for automatic resolution.`, {
						code: "CONTAINER_MISSING_INJECT_DECORATOR",
						context: { className: constructor.name, parameterIndex: index },
						source: "Container",
					});
				}
			}
		} else if (constructorParameters.length > 0) {
			throw new BaseError(`Class ${constructor.name} has constructor parameters but no valid @Inject metadata found (injectionMap type: ${typeof injectionMap}). Ensure parameters are decorated.`, {
				code: "CONTAINER_MISSING_INJECTION_METADATA",
				context: { className: constructor.name },
				source: "Container",
			});
		}

		this.LOGGER.debug(`Instantiating ${constructor.name} with ${String(resolvedArguments.length)} resolved arguments.`, { source: "Container" });

		try {
			const instance: T = new constructor(...resolvedArguments);

			this.LOGGER.info(`Successfully resolved and instantiated ${constructor.name}.`, { source: "Container" });

			return instance;
		} catch (error) {
			this.LOGGER.error(`Error during instantiation of ${constructor.name}: ${error instanceof Error ? error.message : String(error)}`, { context: { error }, source: "Container" });

			throw new BaseError(`Failed to instantiate class ${constructor.name}. Check constructor implementation.`, {
				cause: error instanceof Error ? error : undefined,
				code: "CONTAINER_INSTANTIATION_FAILED",
				context: { className: constructor.name },
				source: "Container",
			});
		}
	}

	/**
	 * Remove a dependency from the container.
	 * @param {symbol} token Token that identifies the dependency.
	 */
	public unregister(token: symbol): void {
		if (!token) {
			throw new BaseError("Token cannot be null or undefined", {
				code: "CONTAINER_TOKEN_NOT_NULL_OR_UNDEFINED",
				context: { token },
				source: "Container",
			});
		}

		this.LOGGER.debug(`Unregistering dependency with token: ${String(token.description)}`, { source: "Container" });

		const wasDeleted: boolean = this.DEPENDENCIES.delete(token);

		if (wasDeleted) {
			this.LOGGER.debug(`Dependency unregistered successfully: ${String(token.description)}`, { source: "Container" });
		} else {
			this.LOGGER.debug(`Dependency not found for unregistering: ${String(token.description)}`, { source: "Container" });
		}
	}

	/**
	 * Remove multiple dependencies from the container.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 */
	public unregisterMany(tokens: Array<symbol>): void {
		if (!tokens) {
			throw new BaseError("Tokens cannot be null or undefined", {
				code: "CONTAINER_TOKENS_NOT_NULL_OR_UNDEFINED",
				context: { tokens },
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
				context: { tokens },
				source: "Container",
			});
		}

		this.LOGGER.debug(`Unregistering ${String(tokens.length)} dependencies`, { source: "Container" });

		// eslint-disable-next-line @elsikora/no-secrets/no-pattern-match
		for (const token of tokens) {
			this.unregister(token);
		}

		this.LOGGER.debug(`${String(tokens.length)} dependencies unregistered`, { source: "Container" });
	}
}
