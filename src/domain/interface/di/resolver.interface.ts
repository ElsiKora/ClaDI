import type { Token } from "@domain/type";

export interface IDiResolver {
	resolve<T>(token: Token<T>): T;
	resolveAll<T>(token: Token<T>): Array<T>;
	resolveAllAsync<T>(token: Token<T>): Promise<Array<T>>;
	resolveAsync<T>(token: Token<T>): Promise<T>;
	resolveOptional<T>(token: Token<T>): T | undefined;
}
