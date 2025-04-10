import type { IRegistry } from "@domain/interface";
import type { TConstructor } from "@domain/type";

import { BaseRegistry } from "@infrastructure/class/base/registry.class";

export const injectableRegistry: IRegistry<TConstructor<unknown>> = new BaseRegistry<TConstructor<unknown>>();
