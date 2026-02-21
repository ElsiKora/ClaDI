import type { EDependencyLifecycle } from "@domain/enum";
import type { Token } from "@domain/type";

export interface IInjectableMetadata {
	deps?: ReadonlyArray<Token<unknown>>;
	lifecycle?: EDependencyLifecycle;
}
