import type { IContainerDynamicFactoryResolutionContext } from "@domain/interface";

/**
 * Type for a dynamic factory function used for complex dependency creation.
 * @param {IContainerDynamicFactoryResolutionContext} context The resolution context, providing access to the container.
 * @returns {T} The created instance.
 * @template T The type of the instance being created.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container#dynamic-factory-functions}
 */
export type TContainerDynamicFactory<T> = (context: IContainerDynamicFactoryResolutionContext) => T;
