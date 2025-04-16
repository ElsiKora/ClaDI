import type { IRegistry } from "@domain/interface";
import type { IBaseRegistryOptions } from "@infrastructure/interface";

import { BaseRegistry } from "@infrastructure/class/base";

/**
 * Creates a new registry instance.
 * @param {IBaseRegistryOptions} options - The options to use for the registry.
 * @returns {IRegistry<T>} A new registry instance.
 * @template T The type of items stored in the registry.
 * @see {@link https://elsikora.com/docs/cladi/utilities/creation-helpers/createRegistry} for more information on this utility.
 * @example
 * ```typescript
 * // Define the structure of items
 * interface ServiceConfig { url: string; timeout: number; }
 *
 * // Create symbols for keys
 * const ServiceKeys = {
 *   Auth: Symbol.for("auth-service"),
 *   User: Symbol.for("user-service"),
 * };
 *
 * // Create a registry
 * const registry = createRegistry<ServiceConfig>();
 *
 * // Register configurations
 * registry.register(ServiceKeys.Auth, { url: "/auth", timeout: 5000 });
 * registry.register(ServiceKeys.User, { url: "/users", timeout: 10000 });
 *
 * // Retrieve a configuration
 * const authConfig = registry.get(ServiceKeys.Auth);
 * console.log(authConfig?.url); // Outputs: /auth
 * ```
 */
export function createRegistry<T>(options?: IBaseRegistryOptions): IRegistry<T> {
	return new BaseRegistry<T>(options);
}
