import type { IContainer, ILogger } from "@domain/interface";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseError } from "@infrastructure/class/base/error.class";
import { ConsoleLoggerService } from "@infrastructure/service";

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
		this.LOGGER = options.logger ?? new ConsoleLoggerService();
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
	 * @param {symbol} token Token that identifies the dependency.
	 * @returns {T | undefined} The dependency, or undefined if it doesn't exist.
	 * @template T The type of the dependency.
	 */
	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public get<T>(token: symbol): T | undefined {
		if (!token) {
			this.LOGGER.warn("Attempted to get dependency with empty token", { source: "Container" });

			return undefined;
		}

		this.LOGGER.debug(`Getting dependency with token: ${String(token.description)}`, { source: "Container" });

		const dependency: T | undefined = this.DEPENDENCIES.get(token) as T | undefined;

		if (dependency) {
			this.LOGGER.debug(`Dependency found: ${String(token.description)}`, { source: "Container" });
		} else {
			this.LOGGER.debug(`Dependency not found: ${String(token.description)}`, { source: "Container" });
		}

		return dependency;
	}

	/**
	 * Get all dependencies from the container.
	 * @returns {Array<unknown>} An array of all dependencies.
	 */
	public getAll(): Array<unknown> {
		this.LOGGER.debug("Getting all dependencies", { source: "Container" });
		const dependencies: Array<unknown> = [...this.DEPENDENCIES.values()];
		this.LOGGER.debug(`Retrieved ${String(dependencies.length)} dependencies`, { source: "Container" });

		return dependencies;
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
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
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
	 * Register a dependency in the container.
	 * @param {symbol} token Token that identifies the dependency.
	 * @param {T} implementation Implementation of the dependency.
	 * @template T The type of the dependency.
	 */
	public register(token: symbol, implementation: unknown): void {
		if (!token) {
			throw new BaseError("Token cannot be null or undefined", {
				code: "CONTAINER_TOKEN_NOT_NULL_OR_UNDEFINED",
				source: "Container",
			});
		}

		this.LOGGER.debug(`Registering dependency with token: ${String(token.description)}`, { source: "Container" });

		if (this.has(token)) {
			throw new BaseError("Dependency already exists in container", {
				code: "CONTAINER_DEPENDENCY_ALREADY_EXISTS",
				source: "Container",
			});
		}

		this.DEPENDENCIES.set(token, implementation);

		this.LOGGER.debug(`Dependency registered successfully: ${String(token.description)}`, { source: "Container" });
	}

	/**
	 * Register multiple dependencies in the container.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 * @param {Array<T>} implementations Implementations of the dependencies.
	 * @template T The type of the dependencies.
	 */

	public registerMany(tokens: Array<symbol>, implementations: Record<symbol, unknown>): void {
		if (!tokens) {
			throw new BaseError("Tokens cannot be null or undefined", {
				code: "CONTAINER_TOKENS_NOT_NULL_OR_UNDEFINED",
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
				source: "Container",
			});
		}

		this.LOGGER.debug(`Registering ${String(tokens.length)} dependencies`, { source: "Container" });

		// eslint-disable-next-line @elsikora/no-secrets/no-pattern-match
		for (const token of tokens) {
			this.register(token, implementations[token]);
		}

		this.LOGGER.debug(`${String(tokens.length)} dependencies registered successfully`, { source: "Container" });
	}

	/**
	 * Remove a dependency from the container.
	 * @param {symbol} token Token that identifies the dependency.
	 */
	public unregister(token: symbol): void {
		if (!token) {
			throw new BaseError("Token cannot be null or undefined", {
				code: "CONTAINER_TOKEN_NOT_NULL_OR_UNDEFINED",
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
				source: "Container",
			});
		}

		if (!Array.isArray(tokens)) {
			throw new BaseError("Tokens must be an array", {
				code: "CONTAINER_TOKENS_NOT_ARRAY",
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
