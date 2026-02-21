import type { EDependencyLifecycle } from "@domain/enum";
import type { Token } from "@domain/type";

export interface ICreateAutowireProviderOptions<T, TDependencies extends ReadonlyArray<Token<unknown>> = ReadonlyArray<Token<unknown>>> {
	deps?: TDependencies;
	lifecycle?: EDependencyLifecycle;
	onDispose?(instance: T): Promise<void> | void;
	token: Token<T>;
}
