import type { IDIModule } from "@domain/interface";
import type { Constructor, IDIContainer } from "@domain/type";

import { BaseError } from "@infrastructure/class/base";

import { composeModules } from "./compose-modules.utility";
import { createModuleFromDecorator } from "./create";

/**
 * Composes module graph from mixed decorated module classes and plain module definitions.
 * @param {IDIContainer} container Target container.
 * @param {Array<Constructor<unknown> | IDIModule>} modules Decorated module classes or plain module definitions.
 */
export function composeDecoratedModules(container: IDIContainer, modules: Array<Constructor<unknown> | IDIModule>): void {
	const resolvedModules: Array<IDIModule> = modules.map((moduleEntry: Constructor<unknown> | IDIModule) => resolveModuleDefinition(moduleEntry));
	composeModules(container, resolvedModules);
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
 * Resolves a module entry to plain module definition.
 * @param {Constructor<unknown> | IDIModule} moduleEntry Module entry.
 * @returns {IDIModule} Plain module definition.
 */
function resolveModuleDefinition(moduleEntry: Constructor<unknown> | IDIModule): IDIModule {
	if (isModuleDefinition(moduleEntry)) {
		return moduleEntry;
	}

	if (isConstructable(moduleEntry)) {
		return createModuleFromDecorator(moduleEntry);
	}

	throw new BaseError("Module entry must be a decorated module class or module definition", {
		code: "MODULE_ENTRY_INVALID",
		context: {
			entryType: typeof moduleEntry,
		},
		source: "composeDecoratedModules",
	});
}
