import type { Provider, Token } from "@domain/type";

import type { IContainerSnapshot } from "./container-snapshot.interface";
import type { IResolutionExplanation } from "./resolution-explanation.interface";
import type { IDiResolver } from "./resolver.interface";

export interface IDiScope extends IDiResolver {
	createScope(name?: string): IDiScope;
	dispose(): Promise<void>;
	explain<T>(token: Token<T>): IResolutionExplanation;
	getRegisteredTokens(): Array<Token<unknown>>;
	has(token: Token<unknown>): boolean;
	id: string;
	register(providerOrProviders: Array<Provider> | Provider): void;
	snapshot(): IContainerSnapshot;
	validate(): void;
}
