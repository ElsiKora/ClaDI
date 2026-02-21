import type { EDependencyLifecycle } from "@domain/enum";
import type { Token } from "@domain/type";

export interface ICreateAutowireProviderOptions<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>> {
	afterResolve?(instance: T): Promise<void> | void;
	deps?: TDependencies;
	isMultiBinding?: boolean;
	lifecycle?: EDependencyLifecycle;
	onDispose?(instance: T): Promise<void> | void;
	onInit?(instance: T): Promise<void> | void;
	token: Token<T>;
}
