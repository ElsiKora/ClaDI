import type { IDIModule } from "@domain/interface";
import type { ICreateModuleOptions } from "@presentation/ergonomics/interface";

/**
 * Builds a declarative module definition for DI composition.
 * @param {ICreateModuleOptions} options Module configuration.
 * @returns {IDIModule} Normalized module definition.
 */
export function createModule(options: ICreateModuleOptions): IDIModule {
	const moduleDefinition: IDIModule = {
		exports: Object.freeze([...(options.exports ?? [])]),
		imports: Object.freeze([...(options.imports ?? [])]),
		name: options.name,
		providers: Object.freeze([...(options.providers ?? [])]),
	};

	return Object.freeze(moduleDefinition);
}
