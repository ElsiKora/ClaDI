import type { EDiContainerCaptiveDependencyPolicy, EDiContainerDuplicateProviderPolicy } from "@domain/enum";
import type { IResolveInterceptor } from "@domain/interface/di/resolve-interceptor.interface";

export interface IDiScopeCreateOptions {
	asyncResolutionDrainTimeoutMs?: number;
	captiveDependencyPolicy?: EDiContainerCaptiveDependencyPolicy;
	duplicateProviderPolicy?: EDiContainerDuplicateProviderPolicy;
	resolveInterceptors?: ReadonlyArray<IResolveInterceptor>;
}
