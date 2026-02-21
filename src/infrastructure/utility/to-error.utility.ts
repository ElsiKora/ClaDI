/**
 * Converts unknown thrown values to Error instances.
 * @param {unknown} error Thrown value.
 * @returns {Error} Normalized error instance.
 */
export function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	try {
		const serializedError: string | undefined = JSON.stringify(error);

		return new Error(serializedError ?? String(error));
	} catch {
		return new Error(String(error));
	}
}
