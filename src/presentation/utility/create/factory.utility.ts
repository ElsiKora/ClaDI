import type { IFactory } from "@domain/interface";
import type { IBaseFactoryOptions } from "@infrastructure/index";

import { BaseFactory } from "@infrastructure/index";

/**
 * Creates a new factory instance.
 * @param {IBaseFactoryOptions<T>} options - The options to use for the factory.
 * @returns {IFactory<T>} A new factory instance.
 * @template T The type of items created by the factory.
 */
export function createFactory<T>(options: IBaseFactoryOptions<T>): IFactory<T> {
	return new BaseFactory<T>(options);
}
