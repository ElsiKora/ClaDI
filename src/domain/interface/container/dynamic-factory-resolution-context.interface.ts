import type { IContainer } from "./interface";

/**
 * Context provided to dynamic factory functions during resolution.
 */
export interface IContainerDynamicFactoryResolutionContext {
	/**
	 * The container instance performing the resolution.
	 */
	container: IContainer;
}
