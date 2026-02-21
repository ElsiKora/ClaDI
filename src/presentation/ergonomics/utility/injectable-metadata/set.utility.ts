import type { Constructor } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { INJECTABLE_METADATA_KEY } from "@presentation/ergonomics/constant/injectable-metadata-key.constant";

/**
 * Stores injectable metadata on a class constructor.
 * @param {Constructor<unknown>} target Constructor to annotate.
 * @param {IInjectableMetadata} metadata Metadata payload.
 */
export function setInjectableMetadata(target: Constructor<unknown>, metadata: IInjectableMetadata): void {
	(target as { [INJECTABLE_METADATA_KEY]?: IInjectableMetadata })[INJECTABLE_METADATA_KEY] = metadata;
}
