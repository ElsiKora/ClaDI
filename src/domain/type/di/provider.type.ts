import type { IAliasProvider } from "@domain/interface/di/alias-provider.interface";
import type { IClassProvider } from "@domain/interface/di/class-provider.interface";
import type { IFactoryProvider } from "@domain/interface/di/factory-provider.interface";
import type { ILazyProvider } from "@domain/interface/di/lazy-provider.interface";
import type { IValueProvider } from "@domain/interface/di/value-provider.interface";

export type TProvider<T = unknown> = IAliasProvider<T> | IClassProvider<T> | IFactoryProvider<T> | ILazyProvider<() => Promise<unknown>> | IValueProvider<T>;
