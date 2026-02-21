import type { Token } from "@domain/type";

/**
 * Creates a strongly-typed token for DI providers.
 * @param {string} description Token description.
 * @returns {Token<T>} Typed symbol token.
 * @template T Token payload type.
 */
export function createToken<T>(description: string): Token<T> {
	return Symbol(description) as Token<T>;
}
