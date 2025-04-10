import type { IContainer, IRegistry } from "@domain/interface";

import { BaseRegistry } from "@infrastructure/class/base/registry.class";

export const containerRegistry: IRegistry<IContainer> = new BaseRegistry<IContainer>();
