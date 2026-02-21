import type { IProviderBase } from "./provider-base.interface";

export interface IValueProvider<T> extends IProviderBase<T> {
	useValue: T;
}
