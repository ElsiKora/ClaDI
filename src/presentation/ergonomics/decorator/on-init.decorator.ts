import type { Constructor } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Method decorator that marks a class lifecycle onInit hook.
 * @returns {MethodDecorator} Method decorator.
 */
export function OnInit(): MethodDecorator {
	return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void => {
		if (typeof propertyKey !== "string") {
			throw new BaseError("OnInit must target a named class method", {
				code: "ON_INIT_METHOD_NAME_INVALID",
				source: "OnInit",
			});
		}

		if (!descriptor || typeof descriptor.value !== "function") {
			throw new BaseError("OnInit can only be applied to methods", {
				code: "ON_INIT_TARGET_INVALID",
				source: "OnInit",
			});
		}

		const targetConstructor: Constructor<unknown> = target.constructor as Constructor<unknown>;
		const metadata: IInjectableMetadata = getInjectableMetadata(targetConstructor) ?? {};

		if (metadata.onInitMethod !== undefined && metadata.onInitMethod !== propertyKey) {
			throw new BaseError("OnInit lifecycle hook is already defined for this class", {
				code: "ON_INIT_METHOD_DUPLICATE",
				source: "OnInit",
			});
		}

		setInjectableMetadata(targetConstructor, {
			...metadata,
			onInitMethod: propertyKey,
		});
	};
}
