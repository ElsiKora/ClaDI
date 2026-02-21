import type { IDIModule } from "@domain/interface";
import type { Constructor, Provider, Token } from "@domain/type";
import type { IModuleDecoratorOptions } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getModuleMetadata, setModuleMetadata } from "@presentation/ergonomics/utility/module-metadata";

/**
 * Class decorator that stores module composition metadata.
 * @param {IModuleDecoratorOptions} [options] Module metadata options.
 * @returns {ClassDecorator} Class decorator.
 */
export function Module(options: IModuleDecoratorOptions = {}): ClassDecorator {
	validateModuleDecoratorOptions(options);

	const decorator = (target: Constructor<unknown>): void => {
		const currentMetadata: IModuleDecoratorOptions = getModuleMetadata(target) ?? {};

		const mergedMetadata: IModuleDecoratorOptions = {
			exports: options.exports ?? currentMetadata.exports,
			imports: options.imports ?? currentMetadata.imports,
			name: options.name ?? currentMetadata.name,
			providers: options.providers ?? currentMetadata.providers,
		};
		setModuleMetadata(target, mergedMetadata);
	};

	return decorator as ClassDecorator;
}

/**
 * Checks whether input is constructable class constructor.
 * @param {unknown} candidate Candidate value.
 * @returns {boolean} True when value is a constructable class.
 */
function isConstructable(candidate: unknown): candidate is Constructor<unknown> {
	if (typeof candidate !== "function") {
		return false;
	}

	const candidateAsConstructor: { prototype?: { constructor?: unknown } } = candidate as { prototype?: { constructor?: unknown } };
	const prototype: { constructor?: unknown } | undefined = candidateAsConstructor.prototype;

	return !!prototype && prototype.constructor === candidate;
}

/**
 * Checks whether input is module definition shape.
 * @param {unknown} candidate Candidate value.
 * @returns {boolean} True when candidate is module definition-like.
 */
function isModuleDefinition(candidate: unknown): candidate is IDIModule {
	if (typeof candidate !== "object" || candidate === null) {
		return false;
	}

	const moduleCandidate: {
		exports?: unknown;
		imports?: unknown;
		providers?: unknown;
	} = candidate as {
		exports?: unknown;
		imports?: unknown;
		providers?: unknown;
	};

	return Array.isArray(moduleCandidate.exports) && Array.isArray(moduleCandidate.imports) && Array.isArray(moduleCandidate.providers);
}

/**
 * Checks whether input is provider definition shape.
 * @param {unknown} candidate Candidate value.
 * @returns {boolean} True when candidate is provider-like object.
 */
function isProviderDefinition(candidate: unknown): candidate is Provider {
	if (typeof candidate !== "object" || candidate === null) {
		return false;
	}

	const providerCandidate: { provide?: unknown } = candidate as { provide?: unknown };

	return typeof providerCandidate.provide === "symbol";
}

/**
 * Validates module decorator options.
 * @param {IModuleDecoratorOptions} options Module decorator options.
 */
function validateModuleDecoratorOptions(options: IModuleDecoratorOptions): void {
	validateModuleExports(options.exports);
	validateModuleImports(options.imports);
	validateModuleProviders(options.providers);
}

/**
 * Validates module exports list.
 * @param {ReadonlyArray<Token<unknown>> | undefined} exportTokens Export token list.
 */
function validateModuleExports(exportTokens: ReadonlyArray<Token<unknown>> | undefined): void {
	if (exportTokens === undefined) {
		return;
	}

	if (!Array.isArray(exportTokens)) {
		throw new BaseError("Module options exports must be an array", {
			code: "MODULE_OPTIONS_EXPORTS_NOT_ARRAY",
			source: "Module",
		});
	}

	for (const exportToken of exportTokens) {
		if (typeof exportToken !== "symbol") {
			throw new BaseError("Module export token must be a symbol", {
				code: "MODULE_OPTIONS_EXPORT_TOKEN_INVALID",
				source: "Module",
			});
		}
	}
}

/**
 * Validates module imports list.
 * @param {ReadonlyArray<Constructor<unknown> | IDIModule> | undefined} importEntries Import entry list.
 */
function validateModuleImports(importEntries: ReadonlyArray<Constructor<unknown> | IDIModule> | undefined): void {
	if (importEntries === undefined) {
		return;
	}

	if (!Array.isArray(importEntries)) {
		throw new BaseError("Module options imports must be an array", {
			code: "MODULE_OPTIONS_IMPORTS_NOT_ARRAY",
			source: "Module",
		});
	}

	for (const importEntry of importEntries) {
		if (!isConstructable(importEntry) && !isModuleDefinition(importEntry)) {
			throw new BaseError("Module import must be a decorated module class or module definition", {
				code: "MODULE_OPTIONS_IMPORT_INVALID",
				source: "Module",
			});
		}
	}
}

/**
 * Validates module providers list.
 * @param {ReadonlyArray<Constructor<unknown> | Provider> | undefined} providers Provider entry list.
 */
function validateModuleProviders(providers: ReadonlyArray<Constructor<unknown> | Provider> | undefined): void {
	if (providers === undefined) {
		return;
	}

	if (!Array.isArray(providers)) {
		throw new BaseError("Module options providers must be an array", {
			code: "MODULE_OPTIONS_PROVIDERS_NOT_ARRAY",
			source: "Module",
		});
	}

	for (const providerEntry of providers) {
		if (!isConstructable(providerEntry) && !isProviderDefinition(providerEntry)) {
			throw new BaseError("Module provider must be a decorated class or provider definition", {
				code: "MODULE_OPTIONS_PROVIDER_INVALID",
				source: "Module",
			});
		}
	}
}
