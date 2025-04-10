import type { IContainerDynamicFactoryResolutionContext } from "@domain/interface";

/**
 * Type for a dynamic factory function used for complex dependency creation.
 * @template T The type of the instance being created.
 * @param {IContainerDynamicFactoryResolutionContext} context The resolution context, providing access to the container.
 * @returns {T} The created instance.
 */
export type TContainerDynamicFactory<T> = (context: IContainerDynamicFactoryResolutionContext) => T;
