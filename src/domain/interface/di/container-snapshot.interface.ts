export interface IContainerSnapshot {
	childScopeCount: number;
	isDisposed: boolean;
	isLocked: boolean;
	parentScopeId?: string;
	providerCount: number;
	rootScopeId: string;
	scopedCacheSize: number;
	scopeId: string;
	singletonCacheSize: number;
	tokenRegistrations: Array<IContainerSnapshotTokenRegistration>;
	tokens: Array<string>;
}

export interface IContainerSnapshotTokenRegistration {
	hasMultiBinding: boolean;
	registrationCount: number;
	token: string;
}
