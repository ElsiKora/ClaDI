export interface IResolveInterceptor {
	onError?(context: { error: Error; isAsync: boolean; isOptional: boolean; isResolveAll: boolean; scopeId: string; tokenDescription: string }): void;
	onStart?(context: { isAsync: boolean; isOptional: boolean; isResolveAll: boolean; scopeId: string; tokenDescription: string }): void;
	onSuccess?(context: { isAsync: boolean; isOptional: boolean; isResolveAll: boolean; result?: unknown; scopeId: string; tokenDescription: string }): void;
}
