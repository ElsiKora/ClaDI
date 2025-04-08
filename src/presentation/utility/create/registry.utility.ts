import type { IRegistry } from "@domain/interface";
import type { IBaseRegistryOptions } from "@infrastructure/index";

import { BaseRegistry } from "@infrastructure/index";

/**
 * Creates a new registry instance.
 * @param {IBaseRegistryOptions} options - The options to use for the registry.
 * @returns {IRegistry<T>} A new registry instance.
 * @template T The type of items stored in the registry.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/registry} for more information on registries.
 */
export function createRegistry<T extends { name: string }>(options: IBaseRegistryOptions): IRegistry<T> {
	return new BaseRegistry<T>(options);
}
