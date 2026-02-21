import type { EDependencyLifecycle, EProviderType } from "@domain/enum";
import type { Provider } from "@domain/type";

export interface IProviderRegistration<T> {
	cacheKey: symbol;
	isAsyncFactory: boolean;
	isMultiBinding: boolean;
	lifecycle: EDependencyLifecycle;
	provider: Provider<T>;
	type: EProviderType;
}
