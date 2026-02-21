import type { Constructor, Token } from "@domain/type";

import type { IProviderBase } from "./provider-base.interface";

export interface IClassProvider<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>> extends IProviderBase<T> {
	deps?: TDependencies;
	useClass: Constructor<
		T,
		number extends TDependencies["length"]
			? Array<never>
			: {
					[Index in keyof TDependencies]: TDependencies[Index] extends Token<infer TValue> ? TValue : never;
				}
	>;
}
