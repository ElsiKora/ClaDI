import type { Provider, Token } from "@domain/type";

export interface IDiModule {
	exports: ReadonlyArray<Token<unknown>>;
	imports: ReadonlyArray<IDiModule>;
	name?: string;
	providers: ReadonlyArray<Provider>;
}
