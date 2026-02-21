import type { IDIContainer } from "@domain/type";
import type { IDIContainerOptions } from "@infrastructure/interface";

import { DIContainer } from "@infrastructure/class/di";

/**
 * Creates an advanced DI container instance.
 * @param {IDIContainerOptions} [options] Container options.
 * @returns {IDIContainer} A new DI container instance.
 */
export function createDIContainer(options: IDIContainerOptions = {}): IDIContainer {
	return new DIContainer(options);
}
