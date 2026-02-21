import type { DIContainer } from "@infrastructure/class/di/container.class";
import type { IDIContainerOptions } from "@infrastructure/interface";

export interface IInternalContainerOptions extends IDIContainerOptions {
	parent?: DIContainer;
	root?: DIContainer;
}
