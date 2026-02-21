import type { IDIModule } from "@domain/interface";
import type { Provider, Token } from "@domain/type";

export interface ICreateModuleOptions {
	exports?: ReadonlyArray<Token<unknown>>;
	imports?: ReadonlyArray<IDIModule>;
	name?: string;
	providers?: ReadonlyArray<Provider>;
}
