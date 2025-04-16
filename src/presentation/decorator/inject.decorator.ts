import { DECORATOR_TOKENS_CONSTANT } from "@infrastructure/constant";

import "reflect-metadata";

/**
 * Decorator that marks a constructor parameter for dependency injection.
 * It specifies the token (Symbol) used to resolve the dependency from the container.
 * @param {symbol} token The Symbol token identifying the dependency to inject.
 * @returns {ParameterDecorator} A parameter decorator function.
 * @see {@link https://elsikora.com/docs/cladi/decorators/inject} for more details.
 */
export function Inject(token: symbol): ParameterDecorator {
	return function (target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void {
		if (propertyKey === undefined && typeof target === "function") {
			const injectionMap: Map<number, symbol> = (Reflect.getOwnMetadata(DECORATOR_TOKENS_CONSTANT.INJECT_TOKEN_KEY, target) as Map<number, symbol> | undefined) ?? new Map<number, symbol>();

			injectionMap.set(parameterIndex, token);

			Reflect.defineMetadata(DECORATOR_TOKENS_CONSTANT.INJECT_TOKEN_KEY, injectionMap, target);
		} else {
			// eslint-disable-next-line @elsikora/typescript/no-base-to-string
			const targetName: string = typeof target === "function" ? target.name : (target?.constructor?.name ?? String(target));
			console.warn(`@Inject decorator used on potentially invalid location: target=${targetName}, propertyKey=${String(propertyKey)}, index=${String(parameterIndex)}`);
		}
	};
}
