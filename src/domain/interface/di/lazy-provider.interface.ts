import type { Token } from "@domain/type";

import type { IProviderBase } from "./provider-base.interface";

export interface ILazyProvider<TLazyResolver extends () => Promise<unknown> = () => Promise<unknown>> extends IProviderBase<TLazyResolver> {
	useLazy: Token<Awaited<ReturnType<TLazyResolver>>>;
}
