import type { IContainer } from "@domain/interface";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseContainer } from "@infrastructure/class/base";

/**
 * Creates a new container instance.
 * @param {IBaseContainerOptions} options - The options to use for the container.
 * @returns {IContainer} A new container instance.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container} for more information on containers.
 */
export function createContainer(options?: IBaseContainerOptions): IContainer {
	return new BaseContainer(options);
}
