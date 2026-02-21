export type TConstructor<T, TArguments extends ReadonlyArray<unknown> = Array<never>> = new (...arguments_: TArguments) => T;
