import { EDependencyLifecycle } from "@domain/enum";
import { describe, expect, it } from "vitest";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";

const SingletonToken = createToken<{ id: number }>("PerfSingleton");
const TransientToken = createToken<{ id: number }>("PerfTransient");

describe("DI container perf-oriented checks", () => {
	it("keeps singleton provider creation at O(1) across many resolves", () => {
		let calls = 0;
		const container = new DIContainer();

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: SingletonToken,
			useFactory: () => ({ id: ++calls }),
		});

		for (let index = 0; index < 5000; index += 1) {
			container.resolve(SingletonToken);
		}

		expect(calls).toBe(1);
	});

	it("creates a transient instance for each resolve", () => {
		let calls = 0;
		const container = new DIContainer();

		container.register({
			lifecycle: EDependencyLifecycle.TRANSIENT,
			provide: TransientToken,
			useFactory: () => ({ id: ++calls }),
		});

		for (let index = 0; index < 2000; index += 1) {
			container.resolve(TransientToken);
		}

		expect(calls).toBe(2000);
	});

	it("reuses stateless coordinators across child scopes", () => {
		const root = new DIContainer();
		const childScopeA = root.createScope("perf-child-a");
		const childScopeB = root.createScope("perf-child-b");
		const rootCacheCoordinator = (root as unknown as { CACHE_COORDINATOR: unknown }).CACHE_COORDINATOR;
		const rootLookupCoordinator = (root as unknown as { LOOKUP_COORDINATOR: unknown }).LOOKUP_COORDINATOR;
		const childACacheCoordinator = (childScopeA as unknown as { CACHE_COORDINATOR: unknown }).CACHE_COORDINATOR;
		const childBCacheCoordinator = (childScopeB as unknown as { CACHE_COORDINATOR: unknown }).CACHE_COORDINATOR;
		const childALookupCoordinator = (childScopeA as unknown as { LOOKUP_COORDINATOR: unknown }).LOOKUP_COORDINATOR;
		const childBLookupCoordinator = (childScopeB as unknown as { LOOKUP_COORDINATOR: unknown }).LOOKUP_COORDINATOR;

		expect(childACacheCoordinator).toBe(rootCacheCoordinator);
		expect(childBCacheCoordinator).toBe(rootCacheCoordinator);
		expect(childALookupCoordinator).toBe(rootLookupCoordinator);
		expect(childBLookupCoordinator).toBe(rootLookupCoordinator);
	});
});
