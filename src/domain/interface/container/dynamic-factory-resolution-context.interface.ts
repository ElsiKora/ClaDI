import type { IContainer } from "./interface";

/**
 * Context provided to dynamic factory functions during resolution.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container#dynamic-factory-functions}
 */
export interface IContainerDynamicFactoryResolutionContext {
	/**
	 * The container instance performing the resolution.
	 */
	container: IContainer;
}
