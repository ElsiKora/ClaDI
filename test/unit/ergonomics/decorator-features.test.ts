import type { IDIModule } from "@domain/interface";
import type { Constructor } from "@domain/type";

import { EDependencyLifecycle } from "@domain/enum";
import { describe, expect, it } from "vitest";
import { BaseError } from "@infrastructure/class/base";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";
import { AfterResolve, Inject, Injectable, Module, OnDispose, OnInit, autowire, composeDecoratedModules, composeModules, createModule, createModuleFromDecorator, getInjectableMetadata, getModuleMetadata } from "@presentation/ergonomics";

const DecoratorConfigToken = createToken<{ env: string }>("DecoratorConfig");
const DecoratorRepositoryToken = createToken<RepositoryService>("DecoratorRepository");
const DecoratorApplicationServiceToken = createToken<ApplicationService>("DecoratorApplicationService");
const DecoratorHookedServiceToken = createToken<HookedService>("DecoratorHookedService");
const DecoratorPluginToken = createToken<string>("DecoratorPlugin");

class RepositoryService {
	constructor(private readonly config: { env: string }) {}

	public getEnvironment(): string {
		return this.config.env;
	}
}

class ApplicationService {
	constructor(private readonly repository: RepositoryService) {}

	public readEnvironment(): string {
		return this.repository.getEnvironment();
	}
}

class HookedService {
	public disposeCount: number = 0;

	public initCount: number = 0;

	public resolveCount: number = 0;

	public markDispose(): void {
		this.disposeCount += 1;
	}

	public markInit(): void {
		this.initCount += 1;
	}

	public markResolve(): void {
		this.resolveCount += 1;
	}
}

describe("decorator features", () => {
	it("stores token and multi-binding metadata through Injectable", () => {
		class PluginClass {}

		Injectable({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorPluginToken,
		})(PluginClass);

		const metadata = getInjectableMetadata(PluginClass);

		expect(metadata?.token).toBe(DecoratorPluginToken);
		expect(metadata?.isMultiBinding).toBe(true);
		expect(metadata?.lifecycle).toBe(EDependencyLifecycle.SINGLETON);
	});

	it("creates providers with metadata token using autowire shorthand", () => {
		class PluginClass {}

		Injectable({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorPluginToken,
		})(PluginClass);

		const provider = autowire(PluginClass);

		expect(provider.provide).toBe(DecoratorPluginToken);
		expect(provider.lifecycle).toBe(EDependencyLifecycle.SINGLETON);
		expect(provider.isMultiBinding).toBe(true);
		expect(provider.useClass).toBe(PluginClass);
	});

	it("wires lifecycle method decorators to provider hooks", async () => {
		OnInit()(HookedService.prototype, "markInit", Object.getOwnPropertyDescriptor(HookedService.prototype, "markInit") as PropertyDescriptor);
		AfterResolve()(HookedService.prototype, "markResolve", Object.getOwnPropertyDescriptor(HookedService.prototype, "markResolve") as PropertyDescriptor);
		OnDispose()(HookedService.prototype, "markDispose", Object.getOwnPropertyDescriptor(HookedService.prototype, "markDispose") as PropertyDescriptor);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorHookedServiceToken,
		})(HookedService);

		const container = new DIContainer();
		container.register(autowire(HookedService));

		const firstResolve: HookedService = container.resolve(DecoratorHookedServiceToken);
		const secondResolve: HookedService = container.resolve(DecoratorHookedServiceToken);

		expect(firstResolve).toBe(secondResolve);
		expect(firstResolve.initCount).toBe(1);
		expect(firstResolve.resolveCount).toBe(2);

		await container.dispose();
		expect(firstResolve.disposeCount).toBe(1);
	});

	it("creates module definitions from @Module-decorated classes", () => {
		Inject(DecoratorConfigToken)(RepositoryService, undefined, 0);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorRepositoryToken,
		})(RepositoryService);

		Inject(DecoratorRepositoryToken)(ApplicationService, undefined, 0);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorApplicationServiceToken,
		})(ApplicationService);

		class DataModuleClass {}
		Module({
			exports: [DecoratorRepositoryToken],
			name: "data-module-class",
			providers: [RepositoryService],
		})(DataModuleClass);

		class AppModuleClass {}
		Module({
			exports: [DecoratorApplicationServiceToken],
			imports: [DataModuleClass],
			name: "app-module-class",
			providers: [
				{
					provide: DecoratorConfigToken,
					useValue: { env: "test" },
				},
				ApplicationService,
			],
		})(AppModuleClass);

		const moduleMetadata = getModuleMetadata(AppModuleClass);
		expect(moduleMetadata?.name).toBe("app-module-class");
		expect(moduleMetadata?.imports?.length).toBe(1);

		const moduleDefinition: IDIModule = createModuleFromDecorator(AppModuleClass);
		const container = new DIContainer();
		composeModules(container, [moduleDefinition]);

		const applicationService: ApplicationService = container.resolve(DecoratorApplicationServiceToken);
		expect(applicationService.readEnvironment()).toBe("test");
	});

	it("supports importing plain module definitions inside @Module metadata", () => {
		const plainModule: IDIModule = createModule({
			exports: [DecoratorConfigToken],
			name: "plain-config-module",
			providers: [
				{
					provide: DecoratorConfigToken,
					useValue: { env: "plain" },
				},
			],
		});

		Inject(DecoratorConfigToken)(RepositoryService, undefined, 0);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DecoratorRepositoryToken,
		})(RepositoryService);

		class ModuleClass {}
		Module({
			exports: [DecoratorRepositoryToken],
			imports: [plainModule],
			name: "decorator-module-with-plain-import",
			providers: [RepositoryService],
		})(ModuleClass);

		const container = new DIContainer();
		composeModules(container, [createModuleFromDecorator(ModuleClass)]);

		const repository: RepositoryService = container.resolve(DecoratorRepositoryToken);
		expect(repository.getEnvironment()).toBe("plain");
	});

	it("composes decorated modules directly without manual conversion", () => {
		const DirectConfigToken = createToken<string>("DirectDecoratorConfig");
		const DirectServiceToken = createToken<DirectService>("DirectDecoratorService");

		class DirectService {
			constructor(public readonly configValue: string) {}
		}

		Inject(DirectConfigToken)(DirectService, undefined, 0);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: DirectServiceToken,
		})(DirectService);

		class DirectModuleClass {}
		Module({
			exports: [DirectServiceToken],
			name: "direct-module",
			providers: [
				{
					provide: DirectConfigToken,
					useValue: "direct-config",
				},
				DirectService,
			],
		})(DirectModuleClass);

		const container = new DIContainer();
		composeDecoratedModules(container, [DirectModuleClass]);

		const service: DirectService = container.resolve(DirectServiceToken);
		expect(service.configValue).toBe("direct-config");
	});

	it("composes mixed decorated and plain module entries", () => {
		const MixedConfigToken = createToken<string>("MixedDecoratorConfig");
		const MixedServiceToken = createToken<MixedService>("MixedDecoratorService");

		class MixedService {
			constructor(public readonly configValue: string) {}
		}

		Inject(MixedConfigToken)(MixedService, undefined, 0);
		Injectable({
			lifecycle: EDependencyLifecycle.SINGLETON,
			token: MixedServiceToken,
		})(MixedService);

		const plainModule: IDIModule = createModule({
			exports: [MixedConfigToken],
			name: "mixed-plain-module",
			providers: [{ provide: MixedConfigToken, useValue: "mixed-config" }],
		});

		class MixedModuleClass {}
		Module({
			exports: [MixedServiceToken],
			imports: [plainModule],
			name: "mixed-decorated-module",
			providers: [MixedService],
		})(MixedModuleClass);

		const container = new DIContainer();
		composeDecoratedModules(container, [MixedModuleClass, plainModule]);

		const service: MixedService = container.resolve(MixedServiceToken);
		expect(service.configValue).toBe("mixed-config");
	});

	it("throws structured error when module entry type is invalid", () => {
		const container = new DIContainer();
		const invalidModuleEntry: Constructor<unknown> | IDIModule = 42 as unknown as Constructor<unknown> | IDIModule;

		try {
			composeDecoratedModules(container, [invalidModuleEntry]);
			expect.unreachable("composeDecoratedModules must throw for invalid module entries");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("MODULE_ENTRY_INVALID");
		}
	});

	it("throws when @Module provider class misses injectable token metadata", () => {
		class MissingDecoratorProvider {}
		class InvalidModuleClass {}

		Module({
			name: "invalid-module",
			providers: [MissingDecoratorProvider],
		})(InvalidModuleClass);

		expect(() => createModuleFromDecorator(InvalidModuleClass)).toThrow("Injectable metadata token is missing");
	});
});
