import type { Constructor } from "@domain/type";
import type { IInjectableMetadata } from "@presentation/ergonomics/interface";

import { INJECTABLE_METADATA_KEY } from "@presentation/ergonomics/constant/injectable-metadata-key.constant";

/**
 * Reads injectable metadata from a class constructor.
 * @param {Constructor<unknown>} target Constructor to inspect.
 * @returns {IInjectableMetadata | undefined} Stored metadata.
 */
export function getInjectableMetadata(target: Constructor<unknown>): IInjectableMetadata | undefined {
	const targetWithMetadata: { [INJECTABLE_METADATA_KEY]?: IInjectableMetadata } = target as unknown as { [INJECTABLE_METADATA_KEY]?: IInjectableMetadata };
	const hasOwnMetadata: boolean = Object.prototype.hasOwnProperty.call(targetWithMetadata, INJECTABLE_METADATA_KEY);

	if (!hasOwnMetadata) {
		return undefined;
	}

	return targetWithMetadata[INJECTABLE_METADATA_KEY];
}
