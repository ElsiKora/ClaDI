import type { Token } from "@domain/type";

import type { IProviderBase } from "./provider-base.interface";

export interface IAliasProvider<T> extends IProviderBase<T> {
	useExisting: Token<T>;
}
