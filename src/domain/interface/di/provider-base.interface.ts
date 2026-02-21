import type { EDependencyLifecycle } from "@domain/enum";
import type { Token } from "@domain/type";

export interface IProviderBase<T> {
	afterResolve?(instance: T): Promise<void> | void;
	isMultiBinding?: boolean;
	lifecycle?: EDependencyLifecycle;
	onDispose?(instance: T): Promise<void> | void;
	onInit?(instance: T): Promise<void> | void;
	provide: Token<T>;
}
