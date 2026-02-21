import type { Constructor } from "@domain/type";
import type { IModuleDecoratorOptions } from "@presentation/ergonomics/interface";

import { MODULE_METADATA_KEY } from "@presentation/ergonomics/constant/module-metadata-key.constant";

/**
 * Stores module decorator metadata on a class constructor.
 * @param {Constructor<unknown>} target Constructor to annotate.
 * @param {IModuleDecoratorOptions} metadata Module metadata payload.
 */
export function setModuleMetadata(target: Constructor<unknown>, metadata: IModuleDecoratorOptions): void {
	(target as { [MODULE_METADATA_KEY]?: IModuleDecoratorOptions })[MODULE_METADATA_KEY] = metadata;
}
