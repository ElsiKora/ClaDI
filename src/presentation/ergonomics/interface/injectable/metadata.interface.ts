import type { EDependencyLifecycle } from "@domain/enum";
import type { Token } from "@domain/type";

export interface IInjectableMetadata {
	afterResolveMethod?: string;
	deps?: ReadonlyArray<Token<unknown>>;
	isMultiBinding?: boolean;
	lifecycle?: EDependencyLifecycle;
	onDisposeMethod?: string;
	onInitMethod?: string;
	token?: Token<unknown>;
}
