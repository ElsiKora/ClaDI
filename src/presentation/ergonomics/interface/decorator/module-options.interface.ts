import type { IDIModule } from "@domain/interface";
import type { Constructor, Provider, Token } from "@domain/type";

export interface IModuleDecoratorOptions {
	exports?: ReadonlyArray<Token<unknown>>;
	imports?: ReadonlyArray<Constructor<unknown> | IDIModule>;
	name?: string;
	providers?: ReadonlyArray<Constructor<unknown> | Provider>;
}
