import type { Constructor } from "@domain/type";
import type { IInjectableMetadata, IInjectableOptions } from "@presentation/ergonomics/interface";

import { EDependencyLifecycle } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base";
import { getInjectableMetadata, setInjectableMetadata } from "@presentation/ergonomics/utility/injectable-metadata";

const DEPENDENCY_LIFECYCLE_VALUES: ReadonlySet<EDependencyLifecycle> = new Set<EDependencyLifecycle>(Object.values(EDependencyLifecycle));

/**
 * Class decorator that stores DI metadata without reflection dependencies.
 * @param {IInjectableOptions} [options] Injectable metadata options.
 * @returns {ClassDecorator} Class decorator.
 */
export function Injectable(options: IInjectableOptions = {}): ClassDecorator {
	validateInjectableOptions(options);

	const decorator = (target: Constructor<unknown>): void => {
		const currentMetadata: IInjectableMetadata = getInjectableMetadata(target) ?? {};

		const mergedMetadata: IInjectableMetadata = {
			afterResolveMethod: options.afterResolveMethod ?? currentMetadata.afterResolveMethod,
			deps: options.deps ?? currentMetadata.deps,
			isMultiBinding: options.isMultiBinding ?? currentMetadata.isMultiBinding,
			lifecycle: options.lifecycle ?? currentMetadata.lifecycle,
			onDisposeMethod: options.onDisposeMethod ?? currentMetadata.onDisposeMethod,
			onInitMethod: options.onInitMethod ?? currentMetadata.onInitMethod,
			token: options.token ?? currentMetadata.token,
		};
		setInjectableMetadata(target, mergedMetadata);
	};

	return decorator as ClassDecorator;
}

/**
 * Validates injectable decorator options.
 * @param {IInjectableOptions} options Injectable decorator options.
 * @returns {void}
 */
function validateInjectableOptions(options: IInjectableOptions): void {
	const dependencies: ReadonlyArray<symbol> | undefined = options.deps;

	if (dependencies !== undefined) {
		if (!Array.isArray(dependencies)) {
			throw new BaseError("Injectable options deps must be an array", {
				code: "INJECTABLE_OPTIONS_DEPS_NOT_ARRAY",
				source: "Injectable",
			});
		}

		for (let dependencyIndex: number = 0; dependencyIndex < dependencies.length; dependencyIndex += 1) {
			const hasDependencyAtIndex: boolean = Object.prototype.hasOwnProperty.call(dependencies, dependencyIndex);

			if (!hasDependencyAtIndex) {
				throw new BaseError("Injectable options deps has sparse dependency indexes", {
					code: "INJECTABLE_OPTIONS_DEPS_SPARSE",
					context: { index: dependencyIndex },
					source: "Injectable",
				});
			}

			if (typeof dependencies[dependencyIndex] !== "symbol") {
				throw new BaseError("Injectable options dependency token must be a symbol", {
					code: "INJECTABLE_OPTIONS_DEPS_TOKEN_INVALID",
					context: { index: dependencyIndex },
					source: "Injectable",
				});
			}
		}
	}

	if (options.lifecycle !== undefined && !DEPENDENCY_LIFECYCLE_VALUES.has(options.lifecycle)) {
		throw new BaseError("Injectable options lifecycle is invalid", {
			code: "INJECTABLE_OPTIONS_LIFECYCLE_INVALID",
			context: { lifecycle: options.lifecycle },
			source: "Injectable",
		});
	}

	if (options.token !== undefined && typeof options.token !== "symbol") {
		throw new BaseError("Injectable options token must be a symbol", {
			code: "INJECTABLE_OPTIONS_TOKEN_INVALID",
			source: "Injectable",
		});
	}

	if (options.isMultiBinding !== undefined && typeof options.isMultiBinding !== "boolean") {
		throw new BaseError("Injectable options isMultiBinding must be a boolean", {
			code: "INJECTABLE_OPTIONS_MULTI_BINDING_INVALID",
			source: "Injectable",
		});
	}
}
