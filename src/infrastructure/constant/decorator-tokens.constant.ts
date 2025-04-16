/**
 * Metadata key used to store injection tokens for constructor parameters.
 * The metadata stored will be a Map where the key is the parameter index and the value is the injection token (Symbol).
 */
export const INJECT_TOKEN_KEY: unique symbol = Symbol("cladi:inject_token");

/**
 * Metadata key used to store the container name associated with an injectable class.
 */
export const INJECTABLE_CONTAINER_KEY: unique symbol = Symbol("cladi:injectable_container");

/**
 * Constants for the decorator tokens.
 */
export const DECORATOR_TOKENS_CONSTANT: {
	readonly INJECT_TOKEN_KEY: typeof INJECT_TOKEN_KEY;
	readonly INJECTABLE_CONTAINER_KEY: typeof INJECTABLE_CONTAINER_KEY;
} = {
	INJECT_TOKEN_KEY: INJECT_TOKEN_KEY,
	INJECTABLE_CONTAINER_KEY: INJECTABLE_CONTAINER_KEY,
};
