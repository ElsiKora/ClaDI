import type { Constructor } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Method decorator that marks a class lifecycle onDispose hook.
 * @returns {MethodDecorator} Method decorator.
 */
export function OnDispose(): MethodDecorator {
	return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
		if (typeof propertyKey !== "string") {
			throw new BaseError("OnDispose must target a named class method", {
				code: "ON_DISPOSE_METHOD_NAME_INVALID",
				source: "OnDispose",
			});
		}

		if (!descriptor || typeof descriptor.value !== "function") {
			throw new BaseError("OnDispose can only be applied to methods", {
				code: "ON_DISPOSE_TARGET_INVALID",
				source: "OnDispose",
			});
		}

		const targetConstructor: Constructor<unknown> = target.constructor as Constructor<unknown>;
		const metadata: IInjectableMetadata = getInjectableMetadata(targetConstructor) ?? {};

		if (metadata.onDisposeMethod !== undefined && metadata.onDisposeMethod !== propertyKey) {
			throw new BaseError("OnDispose lifecycle hook is already defined for this class", {
				code: "ON_DISPOSE_METHOD_DUPLICATE",
				source: "OnDispose",
			});
		}

		setInjectableMetadata(targetConstructor, {
			...metadata,
			onDisposeMethod: propertyKey,
		});
	};
}
