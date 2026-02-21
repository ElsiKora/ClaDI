import type { IDIModule } from "@domain/interface";

import { EDependencyLifecycle, EDiContainerDuplicateProviderPolicy } from "@domain/enum";
import { describe, expect, it } from "vitest";
import { BaseError } from "@infrastructure/class/base";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";
import { Inject, Injectable, composeModules, createAutowireProvider, createModule, getInjectableMetadata } from "@presentation/ergonomics";

const ConfigToken = createToken<string>("ConfigToken");
const InternalConfigToken = createToken<string>("InternalConfigToken");
const MissingExportToken = createToken<string>("MissingExportToken");
const OtherConfigToken = createToken<string>("OtherConfigToken");
const SharedConfigToken = createToken<string>("SharedConfigToken");
const UnusedInternalToken = createToken<string>("UnusedInternalToken");
const ServiceToken = createToken<ConfigService>("ConfigService");
const PublicConfigSummaryToken = createToken<string>("PublicConfigSummary");
const DuplicateModuleToken = createToken<string>("DuplicateModuleToken");
const ReExportedConfigToken = createToken<string>("ReExportedConfigToken");
const AliasInternalToken = createToken<string>("AliasInternalToken");
const AliasPublicToken = createToken<string>("AliasPublicToken");
const MultiBindingPublicToken = createToken<string>("MultiBindingPublicToken");
const MultiBindingInternalFirstToken = createToken<string>("MultiBindingInternalFirstToken");
const MultiBindingInternalSecondToken = createToken<string>("MultiBindingInternalSecondToken");

class ConfigService {
	constructor(private readonly config: string) {}

	public getConfig(): string {
		return this.config;
	}
}

describe("ergonomics layer", () => {
	it("stores and exposes injectable metadata", () => {
		Injectable({ lifecycle: EDependencyLifecycle.SINGLETON })(ConfigService);
		Inject(ConfigToken)(ConfigService, undefined, 0);

		const metadata = getInjectableMetadata(ConfigService);

		expect(metadata?.lifecycle).toBe(EDependencyLifecycle.SINGLETON);
		expect(metadata?.deps).toEqual([ConfigToken]);
	});

	it("merges existing inject metadata when Injectable runs after Inject", () => {
		class MergeService {
			constructor(_config: string) {}
		}

		Inject(ConfigToken)(MergeService, undefined, 0);
		Injectable({ lifecycle: EDependencyLifecycle.SINGLETON })(MergeService);

		const metadata = getInjectableMetadata(MergeService);

		expect(metadata?.deps).toEqual([ConfigToken]);
		expect(metadata?.lifecycle).toBe(EDependencyLifecycle.SINGLETON);
	});

	it("does not inherit injectable metadata through prototype chain", () => {
		class ParentService {}
		class ChildService extends ParentService {}

		Injectable({ deps: [ConfigToken], lifecycle: EDependencyLifecycle.SINGLETON })(ParentService);
		const metadata = getInjectableMetadata(ChildService);

		expect(metadata).toBeUndefined();
	});

	it("throws when Inject is applied to non-constructor parameter", () => {
		class MethodDecoratedService {
			public run(_config: string): string {
				return "ok";
			}
		}
		const injectDecorator = Inject(ConfigToken);

		expect(() => injectDecorator(MethodDecoratedService.prototype, "run", 0)).toThrow("Inject can only be used on constructor parameters");
	});

	it("throws when Inject receives a non-symbol token", () => {
		expect(() => Inject("not-a-symbol" as unknown as symbol)).toThrow("Inject dependency token must be a symbol");
	});

	it("creates class providers from metadata", () => {
		Injectable({ lifecycle: EDependencyLifecycle.SINGLETON })(ConfigService);
		Inject(ConfigToken)(ConfigService, undefined, 0);

		const provider = createAutowireProvider(ConfigService, { token: ServiceToken });

		expect(provider.lifecycle).toBe(EDependencyLifecycle.SINGLETON);
		expect(provider.deps).toEqual([ConfigToken]);
		expect(provider.provide).toBe(ServiceToken);
	});

	it("fails fast when injectable metadata contains sparse dependency indexes", () => {
		class SparseDependencyService {
			constructor(_primary: string, _secondary: string) {}
		}

		Inject(OtherConfigToken)(SparseDependencyService, undefined, 1);
		expect(() => createAutowireProvider(SparseDependencyService, { token: ServiceToken })).toThrow("Injectable metadata has sparse dependency indexes");
	});

	it("composes modules by registering imports first", () => {
		Injectable()(ConfigService);
		Inject(ConfigToken)(ConfigService, undefined, 0);

		const configModule = createModule({
			exports: [ConfigToken],
			name: "config-module",
			providers: [{ provide: ConfigToken, useValue: "from-module" }],
		});

		const serviceModule = createModule({
			imports: [configModule],
			name: "service-module",
			providers: [createAutowireProvider(ConfigService, { token: ServiceToken })],
		});

		const container = new DIContainer();
		composeModules(container, [serviceModule]);

		const service = container.resolve(ServiceToken);
		expect(service.getConfig()).toBe("from-module");
	});

	it("returns immutable module definitions", () => {
		const imports: Array<IDIModule> = [];
		const providers = [{ provide: ConfigToken, useValue: "config" }];
		const moduleDefinition = createModule({
			exports: [ConfigToken],
			imports,
			name: "immutable-module",
			providers,
		});

		expect(Object.isFrozen(moduleDefinition)).toBe(true);
		expect(Object.isFrozen(moduleDefinition.exports)).toBe(true);
		expect(Object.isFrozen(moduleDefinition.imports)).toBe(true);
		expect(Object.isFrozen(moduleDefinition.providers)).toBe(true);
		providers.push({ provide: OtherConfigToken, useValue: "other" });
		expect(moduleDefinition.providers.length).toBe(1);
	});

	it("registers only imported module exports and their local dependency chain", () => {
		const configModule = createModule({
			exports: [PublicConfigSummaryToken],
			name: "config-module",
			providers: [
				{ provide: InternalConfigToken, useValue: "internal-config" },
				{
					deps: [InternalConfigToken],
					provide: PublicConfigSummaryToken,
					useFactory: (configValue: string) => `summary:${configValue}`,
				},
				{ provide: UnusedInternalToken, useValue: "unused-internal" },
			],
		});

		const appModule = createModule({
			imports: [configModule],
			name: "app-module",
		});

		const container = new DIContainer();
		composeModules(container, [appModule]);

		expect(container.resolve(PublicConfigSummaryToken)).toBe("summary:internal-config");
		expect(container.has(UnusedInternalToken)).toBe(false);
	});

	it("does not re-register imported tokens when module registration mode upgrades to root", () => {
		const sharedModule = createModule({
			exports: [SharedConfigToken],
			name: "shared-module",
			providers: [{ provide: SharedConfigToken, useValue: "shared-config" }],
		});
		const appModule = createModule({
			imports: [sharedModule],
			name: "app-module",
		});
		const strictContainer = new DIContainer({
			duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy.ERROR,
		});

		expect(() => composeModules(strictContainer, [appModule, sharedModule])).not.toThrow();
		expect(strictContainer.resolve(SharedConfigToken)).toBe("shared-config");
	});

	it("does not duplicate multi-binding providers when module mode upgrades to root", () => {
		const sharedMultiBindingToken = createToken<string>("SharedMultiBindingToken");
		const sharedModule = createModule({
			exports: [sharedMultiBindingToken],
			name: "shared-multi-binding-module",
			providers: [
				{ isMultiBinding: true, provide: sharedMultiBindingToken, useValue: "first" },
				{ isMultiBinding: true, provide: sharedMultiBindingToken, useValue: "second" },
			],
		});
		const appModule = createModule({
			imports: [sharedModule],
			name: "shared-multi-binding-app-module",
		});
		const container = new DIContainer();

		composeModules(container, [appModule, sharedModule]);

		expect(container.resolveAll(sharedMultiBindingToken)).toEqual(["first", "second"]);
	});

	it("allows re-exported imported tokens without local provider registration", () => {
		const sharedModule = createModule({
			exports: [ReExportedConfigToken],
			name: "re-export-shared-module",
			providers: [{ provide: ReExportedConfigToken, useValue: "re-exported-config" }],
		});
		const bridgeModule = createModule({
			exports: [ReExportedConfigToken],
			imports: [sharedModule],
			name: "re-export-bridge-module",
		});
		const appModule = createModule({
			imports: [bridgeModule],
			name: "re-export-app-module",
		});
		const container = new DIContainer();

		expect(() => composeModules(container, [appModule])).not.toThrow();
		expect(container.resolve(ReExportedConfigToken)).toBe("re-exported-config");
	});

	it("collects alias dependencies for importable provider chains", () => {
		const aliasModule = createModule({
			exports: [AliasPublicToken],
			name: "alias-module",
			providers: [
				{ provide: AliasInternalToken, useValue: "alias-config" },
				{ provide: AliasPublicToken, useExisting: AliasInternalToken },
			],
		});
		const appModule = createModule({
			imports: [aliasModule],
			name: "alias-app-module",
		});
		const container = new DIContainer();

		composeModules(container, [appModule]);

		expect(container.resolve(AliasPublicToken)).toBe("alias-config");
		expect(container.has(AliasInternalToken)).toBe(true);
	});

	it("collects dependency closure across all local providers for one token", () => {
		const multiBindingModule = createModule({
			exports: [MultiBindingPublicToken],
			name: "multi-binding-module",
			providers: [
				{ provide: MultiBindingInternalFirstToken, useValue: "first-internal" },
				{ provide: MultiBindingInternalSecondToken, useValue: "second-internal" },
				{
					deps: [MultiBindingInternalFirstToken],
					isMultiBinding: true,
					provide: MultiBindingPublicToken,
					useFactory: (value: string) => `first:${value}`,
				},
				{
					deps: [MultiBindingInternalSecondToken],
					isMultiBinding: true,
					provide: MultiBindingPublicToken,
					useFactory: (value: string) => `second:${value}`,
				},
			],
		});
		const appModule = createModule({
			imports: [multiBindingModule],
			name: "multi-binding-app-module",
		});
		const container = new DIContainer();

		composeModules(container, [appModule]);

		expect(container.resolveAll(MultiBindingPublicToken)).toEqual(["first:first-internal", "second:second-internal"]);
	});

	it("preserves container duplicate policy for duplicate tokens inside one module definition", () => {
		const duplicateModule = createModule({
			exports: [DuplicateModuleToken],
			name: "duplicate-module",
			providers: [
				{ provide: DuplicateModuleToken, useValue: "first" },
				{ provide: DuplicateModuleToken, useValue: "second" },
			],
		});
		const strictContainer = new DIContainer({
			duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy.ERROR,
		});

		expect(() => composeModules(strictContainer, [duplicateModule])).toThrow("Provider with token already registered in scope");
	});

	it("throws BaseError with structured code for invalid module exports", () => {
		const invalidModule = createModule({
			exports: [MissingExportToken],
			name: "invalid-module",
			providers: [],
		});
		const container = new DIContainer();

		try {
			composeModules(container, [invalidModule]);
			expect.unreachable("composeModules must throw for invalid exports");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("MODULE_EXPORT_INVALID");
		}
	});

	it("throws structured error for circular module imports", () => {
		const moduleAImports: Array<IDIModule> = [];
		const moduleA: IDIModule = {
			exports: [],
			imports: moduleAImports,
			name: "module-a",
			providers: [],
		};
		const moduleB: IDIModule = {
			exports: [],
			imports: [moduleA],
			name: "module-b",
			providers: [],
		};
		moduleAImports.push(moduleB);
		const container = new DIContainer();

		try {
			composeModules(container, [moduleA]);
			expect.unreachable("composeModules must throw for circular imports");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("MODULE_CIRCULAR_DEPENDENCY");
		}
	});
});
