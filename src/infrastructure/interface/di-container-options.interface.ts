import type { EDiContainerCaptiveDependencyPolicy } from "@domain/enum";
import type { EDiContainerDuplicateProviderPolicy } from "@domain/enum";
import type { ILogger, IResolveInterceptor } from "@domain/interface";

export interface IDiContainerOptions {
	asyncResolutionDrainTimeoutMs?: number;
	captiveDependencyPolicy?: EDiContainerCaptiveDependencyPolicy;
	duplicateProviderPolicy?: EDiContainerDuplicateProviderPolicy;
	logger?: ILogger;
	resolveInterceptors?: ReadonlyArray<IResolveInterceptor>;
	scopeName?: string;
}
