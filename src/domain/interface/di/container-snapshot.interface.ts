export interface IContainerSnapshot {
	childScopeCount: number;
	isDisposed: boolean;
	parentScopeId?: string;
	providerCount: number;
	rootScopeId: string;
	scopedCacheSize: number;
	scopeId: string;
	singletonCacheSize: number;
	tokens: Array<string>;
}
