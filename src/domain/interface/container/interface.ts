import type { TConstructor, TContainerDynamicFactory } from "../../type";

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
	 * @returns The dependency.
	 */
	get<T>(token: symbol): T;

	/**
	 * Get all dependencies from the container.
	 * @returns An array of all dependencies.
	 */
	getAll<T>(): Array<T>;

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
	 * Can register a pre-built instance, a constructor (for singleton resolution),
	 * or a dynamic factory function.
	 * @param {symbol} token Token that identifies the dependency.
	 * @param {T | TConstructor<T> | TContainerDynamicFactory<T>} implementation Instance, constructor, or factory.
	 */
	register<T>(token: symbol, implementation: T | TConstructor<T> | TContainerDynamicFactory<T>): void;

	/**
	 * Register multiple dependencies in the container.
	 * @param {Array<symbol>} tokens Tokens that identify the dependencies.
	 * @param {Record<symbol, T | TConstructor<T> | TContainerDynamicFactory<T>>} implementations Map of tokens to instances, constructors, or factories.
	 */
	registerMany<T>(tokens: Array<symbol>, implementations: Record<symbol, T | TConstructor<T> | TContainerDynamicFactory<T>>): void;

	/**
	 * Resolve a class constructor, creating an instance with injected dependencies.
	 * This is typically used internally by `get` but can be called directly.
	 * @param constructor The class constructor to resolve.
	 * @returns The resolved instance.
	 * @template T The type of the class.
	 */
	resolve<T>(constructor: TConstructor<T>): T;

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
