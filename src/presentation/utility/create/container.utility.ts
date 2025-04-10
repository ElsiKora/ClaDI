import type { IContainer } from "@domain/interface";
import type { IBaseContainerOptions } from "@infrastructure/interface";

import { BaseContainer } from "@infrastructure/class/base";

/**
 * Creates a new named container instance and registers it globally.
 * @param {IBaseContainerOptions} options - The options to use for the container.
 * @returns {IContainer} A new container instance.
 * @throws If a container with the same name is already registered.
 * @see {@link https://elsikora.com/docs/cladi/core-concepts/container} for more information on containers.
 * @example
 * ```typescript
 * const container = createContainer({
 *   name: Symbol.for("my-container"),
 * });
 * ```
 */
export function createContainer(options: IBaseContainerOptions): IContainer {
	const container: IContainer = new BaseContainer(options);

	return container;
}
