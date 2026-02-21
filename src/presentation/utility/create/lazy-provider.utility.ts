import type { EDependencyLifecycle } from "@domain/enum";
import type { ILazyProvider } from "@domain/interface";
import type { Token } from "@domain/type";

/**
 * Creates a provider definition that returns lazy async resolver function.
 * @param {Token<() => Promise<T>>} provide Token for lazy resolver function.
 * @param {Token<Awaited<T>>} dependencyToken Token that will be resolved on lazy invocation.
 * @param {object} [options] Optional provider options and lifecycle hooks.
 * @param {(instance: () => Promise<T>) => Promise<void> | void} [options.afterResolve] Runs after each successful lazy resolver resolution.
 * @param {boolean} [options.isMultiBinding] Marks provider as multi-binding registration.
 * @param {EDependencyLifecycle} [options.lifecycle] Provider lifecycle for lazy resolver instance.
 * @param {(instance: () => Promise<T>) => Promise<void> | void} [options.onDispose] Runs when tracked lazy resolver instance is disposed.
 * @param {(instance: () => Promise<T>) => Promise<void> | void} [options.onInit] Runs once when lazy resolver instance is created.
 * @returns {ILazyProvider<() => Promise<T>>} Lazy provider definition.
 * @template T Lazy dependency value type.
 */
export function createLazyProvider<T>(
	provide: Token<() => Promise<T>>,
	dependencyToken: Token<Awaited<T>>,
	options: {
		afterResolve?(instance: () => Promise<T>): Promise<void> | void;
		isMultiBinding?: boolean;
		lifecycle?: EDependencyLifecycle;
		onDispose?(instance: () => Promise<T>): Promise<void> | void;
		onInit?(instance: () => Promise<T>): Promise<void> | void;
	} = {},
): ILazyProvider<() => Promise<T>> {
	return {
		afterResolve: options.afterResolve,
		isMultiBinding: options.isMultiBinding,
		lifecycle: options.lifecycle,
		onDispose: options.onDispose,
		onInit: options.onInit,
		provide,
		useLazy: dependencyToken,
	};
}
