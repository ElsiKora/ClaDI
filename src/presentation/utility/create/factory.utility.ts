import type { IFactory } from "@domain/interface";
import type { IBaseFactoryOptions } from "@infrastructure/interface";

import { BaseFactory } from "@infrastructure/class/base";

/**
 * Creates a new factory instance.
 * @param {IBaseFactoryOptions<T>} options - The options to use for the factory.
 * @returns {IFactory<T>} A new factory instance.
 * @template T The type of items created by the factory.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/factory} for more information on factories.
 * @example
 * ```typescript
 * // For simple objects (data-only objects)
 * const factory = createFactory<Config>({
 *   registry: configRegistry
 * });
 *
 * // For objects with methods or class instances
 * const factory = createFactory<UserProfile>({
 *   registry: userProfileRegistry,
 *   // Option 1: Using creator (recommended for class instances)
 *   creator: (name, template) => new UserProfile(template.id, template.name, template.email)
 *
 *   // Option 2: Using transformer (alternative approach)
 *   transformer: (template) => ({
 *     ...template,
 *     getFullName: function() { return `${this.firstName} ${this.lastName}`; }
 *   })
 * });
 * ```
 */
export function createFactory<T>(options: IBaseFactoryOptions<T>): IFactory<T> {
	return new BaseFactory<T>(options);
}
