import type { Constructor } from "@domain/type";
import type { IInjectableMetadata, IInjectableOptions } from "@presentation/ergonomics/interface";

import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

/**
 * Class decorator that stores DI metadata without reflection dependencies.
 * @param {IInjectableOptions} [options] Injectable metadata options.
 * @returns {ClassDecorator} Class decorator.
 */
export function Injectable(options: IInjectableOptions = {}): ClassDecorator {
	const decorator = (target: Constructor<unknown>): void => {
		const currentMetadata: IInjectableMetadata = getInjectableMetadata(target) ?? {};

		const mergedMetadata: IInjectableMetadata = {
			...currentMetadata,
			...options,
			deps: options.deps ?? currentMetadata.deps,
		};
		setInjectableMetadata(target, mergedMetadata);
	};

	return decorator as ClassDecorator;
}
