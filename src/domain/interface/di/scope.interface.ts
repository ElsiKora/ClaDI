import type { Provider, Token } from "@domain/type";

import type { IContainerSnapshot } from "./container-snapshot.interface";
import type { IDependencyGraph } from "./dependency-graph.interface";
import type { IResolutionExplanation } from "./resolution-explanation.interface";
import type { IDiResolver } from "./resolver.interface";
import type { IDiScopeCreateOptions } from "./scope-create-options.interface";

export interface IDiScope extends IDiResolver {
	bootstrap(tokens?: ReadonlyArray<Token<unknown>>): Promise<void>;
	createScope(name?: string, options?: IDiScopeCreateOptions): IDiScope;
	dispose(): Promise<void>;
	explain<T>(token: Token<T>): IResolutionExplanation;
	exportGraph(): IDependencyGraph;
	getRegisteredTokens(): Array<Token<unknown>>;
	has(token: Token<unknown>): boolean;
	id: string;
	isLocked: boolean;
	lock(): void;
	register(providerOrProviders: Array<Provider> | Provider): void;
	snapshot(): IContainerSnapshot;
	unregister<T>(token: Token<T>): Promise<boolean>;
	validate(): void;
}
