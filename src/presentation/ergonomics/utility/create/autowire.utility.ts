import type { IClassProvider } from "@domain/interface";
import type { Constructor, Token } from "@domain/type";
import type { ICreateAutowireProviderOptions, IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

import { createAutowireProvider } from "./autowire-provider.utility";

/**
 * Creates autowired provider using token defined in injectable metadata.
 * @param {Constructor<T>} useClass Class constructor to instantiate.
 * @param {Omit<ICreateAutowireProviderOptions<T, TDependencies>, "token">} [options] Optional provider overrides.
 * @returns {IClassProvider<T, TDependencies>} Class provider definition.
 * @template T Provider instance type.
 * @template TDependencies Constructor dependency tokens.
 */
export function autowire<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>>(
	useClass: Constructor<
		T,
		number extends TDependencies["length"]
			? Array<never>
			: {
					[Index in keyof TDependencies]: TDependencies[Index] extends Token<infer TValue> ? TValue : never;
				}
	>,
	options: Omit<ICreateAutowireProviderOptions<T, TDependencies>, "token"> = {},
): IClassProvider<T, TDependencies> {
	const metadata: IInjectableMetadata | undefined = getInjectableMetadata(useClass as Constructor<unknown>);
	const metadataToken: Token<T> | undefined = metadata?.token as Token<T> | undefined;

	if (!metadataToken || typeof metadataToken !== "symbol") {
		throw new BaseError("Injectable metadata token is missing; use @Injectable({ token }) or createAutowireProvider(..., { token })", {
			code: "INJECTABLE_TOKEN_MISSING",
			context: {
				className: (useClass as unknown as { name?: string }).name ?? "anonymous-class",
			},
			source: "autowire",
		});
	}

	return createAutowireProvider(useClass, {
		...options,
		token: metadataToken,
	});
}
