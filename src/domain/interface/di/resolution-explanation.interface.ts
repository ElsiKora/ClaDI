import type { EDependencyLifecycle, EProviderType } from "@domain/enum";

export interface IResolutionExplanation {
	dependencies: Array<string>;
	hasRootSingletonCache: boolean;
	hasScopeCache: boolean;
	isAsyncFactory?: boolean;
	isFound: boolean;
	lifecycle?: EDependencyLifecycle;
	lookupPath: Array<string>;
	providerType?: EProviderType;
	scopeId: string;
	token: string;
}
