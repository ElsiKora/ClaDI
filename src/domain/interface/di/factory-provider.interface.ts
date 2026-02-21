import type { Token } from "@domain/type";

import type { IProviderBase } from "./provider-base.interface";

export interface IFactoryProvider<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>> extends IProviderBase<T> {
	deps?: TDependencies;
	useFactory: (
		...arguments_: number extends TDependencies["length"]
			? Array<never>
			: {
					[Index in keyof TDependencies]: TDependencies[Index] extends Token<infer TValue> ? TValue : never;
				}
	) => Promise<T> | T;
}
