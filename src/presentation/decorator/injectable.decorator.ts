import { DECORATOR_TOKENS_CONSTANT } from "@presentation/constant";

import "reflect-metadata";

/**
 * Decorator that marks a class as injectable and associates it with a named container.
 * This allows the class to be automatically managed by the dependency injection system.
 * @param {symbol} containerName The Symbol representing the name of the container to associate the class with.
 * @returns {TFunction} A class decorator function.
 * @template TFunction The type of the target function.
 * @see {@link https://elsikora.com/docs/cladi/decorators/injectable} for more details.
 */
export function Injectable(containerName: symbol) {
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	return <TFunction extends Function>(target: TFunction): TFunction => {
		if (typeof target !== "function" || !target.prototype) {
			throw new Error("Injectable decorator can only be applied to classes.");
		}

		Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECTABLE_CONTAINER_KEY, containerName, target);

		return target;
	};
}
