import type { Constructor } from "@domain/type";
import type { IModuleDecoratorOptions } from "@presentation/ergonomics/interface";

import { MODULE_METADATA_KEY } from "@presentation/ergonomics/constant/module-metadata-key.constant";

/**
 * Reads module decorator metadata from a class constructor.
 * @param {Constructor<unknown>} target Constructor to inspect.
 * @returns {IModuleDecoratorOptions | undefined} Stored module metadata.
 */
export function getModuleMetadata(target: Constructor<unknown>): IModuleDecoratorOptions | undefined {
	const targetWithMetadata: { [MODULE_METADATA_KEY]?: IModuleDecoratorOptions } = target as unknown as { [MODULE_METADATA_KEY]?: IModuleDecoratorOptions };
	const hasOwnMetadata: boolean = Object.prototype.hasOwnProperty.call(targetWithMetadata, MODULE_METADATA_KEY);

	if (!hasOwnMetadata) {
		return undefined;
	}

	return targetWithMetadata[MODULE_METADATA_KEY];
}
