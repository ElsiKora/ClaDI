import { EDependencyLifecycle } from "@domain/enum";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoreFactory } from "@infrastructure/factory";
import { createLazyProvider, createToken } from "@presentation/utility/create";

const AppNameToken = createToken<string>("AppName");
const ScopedStateToken = createToken<{ created: number }>("ScopedState");
const LazyScopedStateResolverToken = createToken<() => Promise<{ created: number }>>("LazyScopedStateResolver");
const BootServiceToken = createToken<{ load(): Promise<{ created: number }> }>("BootService");

describe("Core Infrastructure E2E Integration", () => {
	let coreFactory: CoreFactory;

	beforeEach(() => {
		coreFactory = CoreFactory.getInstance({
			logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
		});
	});

	it("resolves scoped values and lazy resolver using DI-first APIs", async () => {
		const diContainer = coreFactory.createDIContainer({ scopeName: "root" });
		let sequence = 0;

		diContainer.register({ provide: AppNameToken, useValue: "ClaDI" });
		diContainer.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedStateToken,
			useFactory: async () => ({ created: ++sequence }),
		});
		diContainer.register(createLazyProvider(LazyScopedStateResolverToken, ScopedStateToken));
		diContainer.register({
			deps: [LazyScopedStateResolverToken],
			provide: BootServiceToken,
			useFactory: (lazyStateResolver: () => Promise<{ created: number }>) => ({
				load: async () => await lazyStateResolver(),
			}),
		});

		const rootBootService = await diContainer.resolveAsync(BootServiceToken);
		const rootStateFirst = await rootBootService.load();
		const rootStateSecond = await rootBootService.load();
		const childScope = diContainer.createScope("request");
		const childBootService = await childScope.resolveAsync(BootServiceToken);
		const childState = await childBootService.load();

		expect(diContainer.resolve(AppNameToken)).toBe("ClaDI");
		expect(rootStateFirst).toBe(rootStateSecond);
		expect(childState.created).toBeGreaterThan(rootStateFirst.created);
		await childScope.dispose();
		await diContainer.dispose();
	});
});
