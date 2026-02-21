import type { Constructor } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Method decorator that marks a class lifecycle afterResolve hook.
 * @returns {MethodDecorator} Method decorator.
 */
export function AfterResolve(): MethodDecorator {
	return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
		if (typeof propertyKey !== "string") {
			throw new BaseError("AfterResolve must target a named class method", {
				code: "AFTER_RESOLVE_METHOD_NAME_INVALID",
				source: "AfterResolve",
			});
		}

		if (!descriptor || typeof descriptor.value !== "function") {
			throw new BaseError("AfterResolve can only be applied to methods", {
				code: "AFTER_RESOLVE_TARGET_INVALID",
				source: "AfterResolve",
			});
		}

		const targetConstructor: Constructor<unknown> = target.constructor as Constructor<unknown>;
		const metadata: IInjectableMetadata = getInjectableMetadata(targetConstructor) ?? {};

		if (metadata.afterResolveMethod !== undefined && metadata.afterResolveMethod !== propertyKey) {
			throw new BaseError("AfterResolve lifecycle hook is already defined for this class", {
				code: "AFTER_RESOLVE_METHOD_DUPLICATE",
				source: "AfterResolve",
			});
		}

		setInjectableMetadata(targetConstructor, {
			...metadata,
			afterResolveMethod: propertyKey,
		});
	};
}
