import type { IDIModule } from "@domain/interface";
import type { Constructor, Provider } from "@domain/type";
import type { IModuleDecoratorOptions } from "@presentation/ergonomics/interface";

import { BaseError } from "@infrastructure/class/base";
import { getModuleMetadata } from "@presentation/ergonomics/utility/module-metadata";

import { autowire } from "./autowire.utility";
import { createModule } from "./module.utility";

/**
 * Builds a module definition from a class decorated with @Module.
 * @param {Constructor<unknown>} moduleClass Decorated module class.
 * @returns {IDIModule} Normalized module definition.
 */
export function createModuleFromDecorator(moduleClass: Constructor<unknown>): IDIModule {
	return resolveModuleClass(moduleClass, new Map<Constructor<unknown>, IDIModule>(), []);
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
 * Resolves module class recursively into module definition.
 * @param {Constructor<unknown>} moduleClass Decorated module class.
 * @param {Map<Constructor<unknown>, IDIModule>} cache Resolved module cache.
 * @param {Array<Constructor<unknown>>} path Current recursion path.
 * @returns {IDIModule} Resolved module definition.
 */
function resolveModuleClass(moduleClass: Constructor<unknown>, cache: Map<Constructor<unknown>, IDIModule>, path: Array<Constructor<unknown>>): IDIModule {
	const cachedModuleDefinition: IDIModule | undefined = cache.get(moduleClass);

	if (cachedModuleDefinition) {
		return cachedModuleDefinition;
	}

	if (path.includes(moduleClass)) {
		throw new BaseError("Circular module decorator imports detected", {
			code: "MODULE_DECORATOR_CIRCULAR_IMPORT",
			context: {
				cyclePath: [...path, moduleClass].map((currentModuleClass: Constructor<unknown>) => currentModuleClass.name || "anonymous-module-class"),
			},
			source: "createModuleFromDecorator",
		});
	}

	const metadata: IModuleDecoratorOptions | undefined = getModuleMetadata(moduleClass);

	if (!metadata) {
		throw new BaseError("Module metadata not found on class; decorate class with @Module", {
			code: "MODULE_DECORATOR_METADATA_MISSING",
			context: {
				className: moduleClass.name || "anonymous-module-class",
			},
			source: "createModuleFromDecorator",
		});
	}

	const nextPath: Array<Constructor<unknown>> = [...path, moduleClass];
	const imports: Array<IDIModule> = (metadata.imports ?? []).map((importEntry: Constructor<unknown> | IDIModule) => resolveModuleImport(importEntry, cache, nextPath));
	const providers: Array<Provider> = (metadata.providers ?? []).map((providerEntry: Constructor<unknown> | Provider) => resolveModuleProvider(providerEntry));
	const moduleName: string | undefined = metadata.name ?? (moduleClass.name || undefined);

	const moduleDefinition: IDIModule = createModule({
		exports: metadata.exports,
		imports,
		name: moduleName,
		providers,
	});

	cache.set(moduleClass, moduleDefinition);

	return moduleDefinition;
}

/**
 * Resolves module import entry to module definition.
 * @param {Constructor<unknown> | IDIModule} importEntry Module import entry.
 * @param {Map<Constructor<unknown>, IDIModule>} cache Resolved module cache.
 * @param {Array<Constructor<unknown>>} path Current recursion path.
 * @returns {IDIModule} Resolved module definition.
 */
function resolveModuleImport(importEntry: Constructor<unknown> | IDIModule, cache: Map<Constructor<unknown>, IDIModule>, path: Array<Constructor<unknown>>): IDIModule {
	if (isModuleDefinition(importEntry)) {
		return importEntry;
	}

	if (isConstructable(importEntry)) {
		return resolveModuleClass(importEntry, cache, path);
	}

	throw new BaseError("Module import must be a decorated module class or module definition", {
		code: "MODULE_DECORATOR_IMPORT_INVALID",
		source: "createModuleFromDecorator",
	});
}

/**
 * Resolves module provider entry to provider definition.
 * @param {Constructor<unknown> | Provider} providerEntry Module provider entry.
 * @returns {Provider} Resolved provider definition.
 */
function resolveModuleProvider(providerEntry: Constructor<unknown> | Provider): Provider {
	if (isProviderDefinition(providerEntry)) {
		return providerEntry;
	}

	if (isConstructable(providerEntry)) {
		return autowire(providerEntry) as Provider;
	}

	throw new BaseError("Module provider must be a decorated class or provider definition", {
		code: "MODULE_DECORATOR_PROVIDER_INVALID",
		source: "createModuleFromDecorator",
	});
}
