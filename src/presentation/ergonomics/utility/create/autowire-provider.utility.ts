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
	validateDependencies(dependencies);

	return {
		deps: dependencies as TDependencies,
		lifecycle: options.lifecycle ?? metadata?.lifecycle,
		onDispose: options.onDispose,
		provide: options.token,
		useClass,
	};
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
