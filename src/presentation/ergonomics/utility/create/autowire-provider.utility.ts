import type { IClassProvider } from "@domain/interface";
import type { Constructor, Token } from "@domain/type";
import type { ICreateAutowireProviderOptions, IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Creates a class provider using explicit options and optional class metadata.
 * @param {Constructor<T>} useClass Class constructor to instantiate.
 * @param {ICreateAutowireProviderOptions<T>} options Explicit provider options.
 * @returns {IClassProvider<T>} Class provider definition.
 * @template T Provider instance type.
 */
export function createAutowireProvider<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>>(
	useClass: Constructor<
		T,
		number extends TDependencies["length"]
			? Array<never>
			: {
					[Index in keyof TDependencies]: TDependencies[Index] extends Token<infer TValue> ? TValue : never;
				}
	>,
	options: ICreateAutowireProviderOptions<T, TDependencies>,
): IClassProvider<T, TDependencies> {
	const metadata: IInjectableMetadata | undefined = getInjectableMetadata(useClass as Constructor<unknown>);
	const staticDependencies: ReadonlyArray<Token<unknown>> | undefined = (useClass as unknown as { inject?: ReadonlyArray<Token<unknown>> }).inject;
	const dependencies: ReadonlyArray<Token<unknown>> = options.deps ?? metadata?.deps ?? staticDependencies ?? [];

	const afterResolve: ((instance: T) => Promise<void> | void) | undefined = options.afterResolve ?? createLifecycleMethodHook(useClass as Constructor<T, ReadonlyArray<unknown>>, options.token, metadata?.afterResolveMethod, "afterResolve");

	const onDispose: ((instance: T) => Promise<void> | void) | undefined = options.onDispose ?? createLifecycleMethodHook(useClass as Constructor<T, ReadonlyArray<unknown>>, options.token, metadata?.onDisposeMethod, "onDispose");

	const onInit: ((instance: T) => Promise<void> | void) | undefined = options.onInit ?? createLifecycleMethodHook(useClass as Constructor<T, ReadonlyArray<unknown>>, options.token, metadata?.onInitMethod, "onInit");
	validateDependencies(dependencies);

	return {
		afterResolve,
		deps: dependencies as TDependencies,
		isMultiBinding: options.isMultiBinding ?? metadata?.isMultiBinding,
		lifecycle: options.lifecycle ?? metadata?.lifecycle,
		onDispose,
		onInit,
		provide: options.token,
		useClass,
	};
}

/**
 * Resolves a lifecycle hook method from injectable metadata.
 * @param {Constructor<T>} useClass Provider class.
 * @param {Token<T>} token Provider token for diagnostics.
 * @param {string | undefined} methodName Decorated method name.
 * @param {"afterResolve" | "onDispose" | "onInit"} hookName Hook type.
 * @returns {((instance: T) => Promise<void> | void) | undefined} Lifecycle hook function.
 * @template T Provider instance type.
 */
function createLifecycleMethodHook<T>(useClass: Constructor<T, ReadonlyArray<unknown>>, token: Token<T>, methodName: string | undefined, hookName: "afterResolve" | "onDispose" | "onInit"): ((instance: T) => Promise<void> | void) | undefined {
	if (!methodName) {
		return undefined;
	}

	const prototypeCandidate: unknown = (useClass as unknown as { prototype?: unknown }).prototype;
	const prototype: Record<string, unknown> = (typeof prototypeCandidate === "object" && prototypeCandidate !== null ? prototypeCandidate : {}) as Record<string, unknown>;
	const prototypeMethod: unknown = prototype[methodName];

	if (typeof prototypeMethod !== "function") {
		throw new BaseError("Injectable lifecycle method not found on class prototype", {
			code: "INJECTABLE_LIFECYCLE_METHOD_NOT_FOUND",
			context: {
				hook: hookName,
				methodName,
				token: describeToken(token),
			},
			source: "createAutowireProvider",
		});
	}

	return (instance: T): Promise<void> | void => {
		const instanceRecord: Record<string, unknown> = instance as unknown as Record<string, unknown>;
		const instanceMethod: unknown = instanceRecord[methodName];

		if (typeof instanceMethod !== "function") {
			throw new BaseError("Injectable lifecycle method is not callable on resolved instance", {
				code: "INJECTABLE_LIFECYCLE_METHOD_INVALID",
				context: {
					hook: hookName,
					methodName,
					token: describeToken(token),
				},
				source: "createAutowireProvider",
			});
		}

		return (instanceMethod as (...arguments_: Array<never>) => Promise<void> | void).call(instance);
	};
}

/**
 * Builds readable token description for diagnostics.
 * @param {Token<unknown>} token Provider token.
 * @returns {string} Token description.
 */
function describeToken(token: Token<unknown>): string {
	return token.description ? `Symbol(${token.description})` : token.toString();
}

/**
 * Validates dependency metadata for autowire provider creation.
 * @param {ReadonlyArray<Token<unknown>>} dependencies Dependency token list.
 */
function validateDependencies(dependencies: ReadonlyArray<Token<unknown>>): void {
	for (let dependencyIndex: number = 0; dependencyIndex < dependencies.length; dependencyIndex += 1) {
		const hasDependencyAtIndex: boolean = Object.prototype.hasOwnProperty.call(dependencies, dependencyIndex);

		if (!hasDependencyAtIndex) {
			throw new BaseError("Injectable metadata has sparse dependency indexes", {
				code: "INJECTABLE_METADATA_DEPS_SPARSE",
				context: { index: dependencyIndex },
				source: "createAutowireProvider",
			});
		}

		const dependencyValue: unknown = dependencies[dependencyIndex];

		if (typeof dependencyValue !== "symbol") {
			throw new BaseError("Injectable metadata dependency token must be a symbol", {
				code: "INJECTABLE_METADATA_DEPS_TOKEN_INVALID",
				context: { index: dependencyIndex },
				source: "createAutowireProvider",
			});
		}
	}
}
