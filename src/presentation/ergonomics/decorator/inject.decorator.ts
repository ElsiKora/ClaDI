import type { Constructor, Token } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Parameter decorator to declare constructor dependency tokens.
 * @param {Token<unknown>} dependencyToken Dependency token.
 * @returns {ParameterDecorator} Parameter decorator.
 */
export function Inject(dependencyToken: Token<unknown>): ParameterDecorator {
	if (typeof dependencyToken !== "symbol") {
		throw new BaseError("Inject dependency token must be a symbol", {
			code: "INJECT_TOKEN_NOT_SYMBOL",
			source: "Inject",
		});
	}

	return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
		if (propertyKey !== undefined) {
			throw new BaseError("Inject can only be used on constructor parameters", {
				code: "INJECT_CONSTRUCTOR_ONLY",
				source: "Inject",
			});
		}

		const targetConstructor: Constructor<unknown> = (typeof target === "function" ? target : target.constructor) as Constructor<unknown>;
		const metadata: IInjectableMetadata = getInjectableMetadata(targetConstructor) ?? {};
		const dependencies: Array<Token<unknown>> = [...(metadata.deps ?? [])];
		dependencies[parameterIndex] = dependencyToken;
		setInjectableMetadata(targetConstructor, { ...metadata, deps: dependencies });
	};
}
