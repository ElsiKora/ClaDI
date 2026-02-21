import type { IDIModule } from "@domain/interface";
import type { IDIContainer, Provider, Token } from "@domain/type";

import { BaseError } from "@infrastructure/class/base";

type TModuleRegistrationMode = "import" | "root";
const IMPORT_REGISTRATION_MODE_RANK: number = 1;
const ROOT_REGISTRATION_MODE_RANK: number = 2;

const MODULE_REGISTRATION_MODE_RANK: Record<TModuleRegistrationMode, number> = {
	import: IMPORT_REGISTRATION_MODE_RANK,
	root: ROOT_REGISTRATION_MODE_RANK,
};

/**
 * Registers module trees in deterministic order (imports first, then local providers).
 * Imported modules expose providers through the `exports` contract.
 * @param {IDIContainer} container Target container.
 * @param {Array<IDIModule>} modules Module list to compose.
 */
export function composeModules(container: IDIContainer, modules: Array<IDIModule>): void {
	const processingModules: Set<IDIModule> = new Set<IDIModule>();
	const registeredModuleModes: WeakMap<IDIModule, TModuleRegistrationMode> = new WeakMap<IDIModule, TModuleRegistrationMode>();
	const registeredModuleProvidersByToken: WeakMap<IDIModule, Map<symbol, Provider>> = new WeakMap<IDIModule, Map<symbol, Provider>>();

	const registerModule = (moduleDefinition: IDIModule, mode: TModuleRegistrationMode, modulePath: Array<IDIModule>): void => {
		const previousMode: TModuleRegistrationMode | undefined = registeredModuleModes.get(moduleDefinition);
		const hasSufficientRegistrationMode: boolean = previousMode !== undefined && MODULE_REGISTRATION_MODE_RANK[previousMode] >= MODULE_REGISTRATION_MODE_RANK[mode];

		if (hasSufficientRegistrationMode) {
			return;
		}

		if (processingModules.has(moduleDefinition)) {
			throw new BaseError("Circular module imports detected", {
				code: "MODULE_CIRCULAR_DEPENDENCY",
				context: {
					cyclePath: getModuleCyclePath(modulePath, moduleDefinition),
				},
				source: "composeModules",
			});
		}

		processingModules.add(moduleDefinition);

		try {
			const localProvidersByToken: Map<symbol, Array<Provider>> = getLocalProvidersByToken(moduleDefinition);
			validateModuleExports(moduleDefinition, localProvidersByToken);
			const nextModulePath: Array<IDIModule> = [...modulePath, moduleDefinition];

			for (const importedModule of moduleDefinition.imports) {
				registerModule(importedModule, "import", nextModulePath);
			}

			const providersToRegister: ReadonlyArray<Provider> = mode === "root" ? moduleDefinition.providers : collectImportableProviders(moduleDefinition, localProvidersByToken);
			const previouslyRegisteredProvidersByToken: Map<symbol, Provider> = registeredModuleProvidersByToken.get(moduleDefinition) ?? new Map<symbol, Provider>();
			const nextRegisteredProvidersByToken: Map<symbol, Provider> = new Map<symbol, Provider>(previouslyRegisteredProvidersByToken);

			for (const provider of providersToRegister) {
				const previouslyRegisteredProvider: Provider | undefined = previouslyRegisteredProvidersByToken.get(provider.provide);

				if (previouslyRegisteredProvider === provider) {
					continue;
				}

				container.register(provider);
				nextRegisteredProvidersByToken.set(provider.provide, provider);
			}

			registeredModuleModes.set(moduleDefinition, mode);
			registeredModuleProvidersByToken.set(moduleDefinition, nextRegisteredProvidersByToken);
		} finally {
			processingModules.delete(moduleDefinition);
		}
	};

	for (const moduleDefinition of modules) {
		registerModule(moduleDefinition, "root", []);
	}
}

/**
 * Selects provider subset visible to an importing module.
 * @param {IDIModule} moduleDefinition Source module definition.
 * @param {Map<symbol, Array<Provider>>} localProvidersByToken Local providers indexed by token.
 * @returns {Array<Provider>} Importable providers for current module.
 */
function collectImportableProviders(moduleDefinition: IDIModule, localProvidersByToken: Map<symbol, Array<Provider>>): Array<Provider> {
	const importableTokens: Set<symbol> = new Set<symbol>();
	const pendingTokens: Array<Token<unknown>> = [...moduleDefinition.exports];

	while (pendingTokens.length > 0) {
		const currentToken: Token<unknown> | undefined = pendingTokens.pop();

		if (!currentToken || importableTokens.has(currentToken)) {
			continue;
		}

		importableTokens.add(currentToken);

		const currentProviders: Array<Provider> | undefined = localProvidersByToken.get(currentToken);

		if (!currentProviders) {
			continue;
		}

		for (const currentProvider of currentProviders) {
			const dependencies: ReadonlyArray<Token<unknown>> = getProviderDependencies(currentProvider);

			for (const dependencyToken of dependencies) {
				if (localProvidersByToken.has(dependencyToken)) {
					pendingTokens.push(dependencyToken);
				}
			}
		}
	}

	return moduleDefinition.providers.filter((provider: Provider) => importableTokens.has(provider.provide));
}

/**
 * Converts token symbol to readable debug representation.
 * @param {Token<unknown>} token Provider token.
 * @returns {string} Human readable token string.
 */
function describeToken(token: Token<unknown>): string {
	return token.description ? `Symbol(${token.description})` : token.toString();
}

/**
 * Builds map of local providers by token.
 * @param {IDIModule} moduleDefinition Module definition.
 * @returns {Map<symbol, Array<Provider>>} Providers indexed by token.
 */
function getLocalProvidersByToken(moduleDefinition: IDIModule): Map<symbol, Array<Provider>> {
	const providersByToken: Map<symbol, Array<Provider>> = new Map<symbol, Array<Provider>>();

	for (const provider of moduleDefinition.providers) {
		const providersForToken: Array<Provider> | undefined = providersByToken.get(provider.provide);

		if (providersForToken) {
			providersForToken.push(provider);
			continue;
		}

		providersByToken.set(provider.provide, [provider]);
	}

	return providersByToken;
}

/**
 * Builds a module cycle path for structured error context.
 * @param {Array<IDIModule>} modulePath Current traversal path.
 * @param {IDIModule} repeatedModule Repeated module that closes the cycle.
 * @returns {Array<string>} Human readable cycle chain.
 */
function getModuleCyclePath(modulePath: Array<IDIModule>, repeatedModule: IDIModule): Array<string> {
	const cycleStartIndex: number = modulePath.indexOf(repeatedModule);
	const cycleModules: Array<IDIModule> = cycleStartIndex === -1 ? [...modulePath, repeatedModule] : [...modulePath.slice(cycleStartIndex), repeatedModule];

	return cycleModules.map((cycleModule: IDIModule) => getModuleName(cycleModule));
}

/**
 * Returns readable module identifier for diagnostics.
 * @param {IDIModule} moduleDefinition Module definition.
 * @returns {string} Module name for diagnostics.
 */
function getModuleName(moduleDefinition: IDIModule): string {
	return moduleDefinition.name ?? "anonymous-module";
}

/**
 * Returns direct dependency tokens required by provider strategy.
 * @param {Provider} provider Provider definition.
 * @returns {Array<Token<unknown>>} Direct dependency token list.
 */
function getProviderDependencies(provider: Provider): ReadonlyArray<Token<unknown>> {
	if ("useExisting" in provider) {
		return [provider.useExisting];
	}

	if ("useLazy" in provider) {
		return [provider.useLazy];
	}

	if ("deps" in provider) {
		return provider.deps ?? [];
	}

	return [];
}

/**
 * Ensures each exported token is either local provider token or re-export from imports.
 * @param {IDIModule} moduleDefinition Module definition.
 * @param {Map<symbol, Array<Provider>>} localProvidersByToken Local providers indexed by token.
 */
function validateModuleExports(moduleDefinition: IDIModule, localProvidersByToken: Map<symbol, Array<Provider>>): void {
	const importedExportTokens: Set<symbol> = new Set<symbol>();

	for (const importedModule of moduleDefinition.imports) {
		for (const exportedToken of importedModule.exports) {
			importedExportTokens.add(exportedToken);
		}
	}

	for (const exportedToken of moduleDefinition.exports) {
		const hasLocalProvider: boolean = localProvidersByToken.has(exportedToken);
		const hasImportedExport: boolean = importedExportTokens.has(exportedToken);

		if (!hasLocalProvider && !hasImportedExport) {
			throw new BaseError("Invalid module exports: token is not provided locally or by imported modules", {
				code: "MODULE_EXPORT_INVALID",
				context: {
					moduleName: moduleDefinition.name ?? "anonymous-module",
					token: describeToken(exportedToken),
				},
				source: "composeModules",
			});
		}
	}
}
