/* eslint-disable @elsikora/typescript/no-unnecessary-type-parameters */
/**
 * Simple dependency injection container interface.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container}
 */
export interface IContainer {
	/**
	 * Clear all dependencies from the container.
	 */
	clear(): void;

	/**
	 * Get a dependency from the container.
	 * @param token Token that identifies the dependency.
	 * @returns The dependency, or undefined if it doesn't exist.
	 */
	get<T>(token: symbol): T | undefined;

	/**
	 * Get all dependencies from the container.
	 * @returns An array of all dependencies.
	 */
	getAll(): Array<unknown>;

	/**
	 * Get multiple dependencies from the container.
	 * @param tokens Tokens that identify the dependencies.
	 * @returns An array of dependencies.
	 */
	getMany<T>(tokens: Array<symbol>): Array<T>;

	/**
	 * Check if a dependency exists in the container.
	 * @param token Token that identifies the dependency.
	 * @returns True if the dependency exists, false otherwise.
	 */
	has(token: symbol): boolean;

	/**
	 * Register a dependency in the container.
	 * @param {symbol} token Token that identifies the dependency.
	 * @param {T} implementation Implementation of the dependency.
	 */
	register<T>(token: symbol, implementation: T): void;

	/**
	 * Register a dependency in the container.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 * @param {Record<symbol, T>} implementations Implementations of the dependencies.
	 */
	registerMany<T>(tokens: Array<symbol>, implementations: Record<symbol, T>): void;

	/**
	 * Unregister a dependency from the container.
	 * @param token Token that identifies the dependency.
	 */
	unregister(token: symbol): void;

	/**
	 * Unregister multiple dependencies from the container.
	 * @param tokens Tokens that identify the dependencies.
	 */
	unregisterMany(tokens: Array<symbol>): void;
}
