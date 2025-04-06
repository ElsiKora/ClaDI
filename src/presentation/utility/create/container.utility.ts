import type { IContainer } from "@domain/interface";

import { BaseContainer, type IBaseContainerOptions } from "@infrastructure/index";

/**
 * Creates a new container instance.
 * @param {IBaseContainerOptions} options - The options to use for the container.
 * @returns {IContainer} A new container instance.
 */
export function createContainer(options: IBaseContainerOptions): IContainer {
	return new BaseContainer(options);
}
