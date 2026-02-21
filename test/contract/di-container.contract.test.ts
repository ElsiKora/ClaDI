import { EDependencyLifecycle } from "@domain/enum";
import { describe, expect, it } from "vitest";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";

const ScopedCounterToken = createToken<{ value: number }>("ScopedCounter");
const AsyncCounterToken = createToken<number>("AsyncCounter");
const CircularLeftToken = createToken<string>("CircularLeft");
const CircularRightToken = createToken<string>("CircularRight");
const LazyScopedResolverToken = createToken<() => Promise<{ value: number }>>("LazyScopedResolver");
const HookContractToken = createToken<{ value: number }>("HookContract");

describe("DI container contracts", () => {
	it("isolates scoped instances between scopes", () => {
		let counter = 0;
		const container = new DIContainer();

		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedCounterToken,
			useFactory: () => ({ value: ++counter }),
		});

		const rootValue = container.resolve(ScopedCounterToken);
		const rootValueAgain = container.resolve(ScopedCounterToken);
		const childScope = container.createScope("child");
		const childValue = childScope.resolve(ScopedCounterToken);

		expect(rootValue).toBe(rootValueAgain);
		expect(childValue).not.toBe(rootValue);
		expect(rootValue.value).toBe(1);
		expect(childValue.value).toBe(2);
	});

	it("deduplicates async singleton initialization under concurrent requests", async () => {
		let calls = 0;
		const container = new DIContainer();

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncCounterToken,
			useFactory: async () => {
				calls += 1;
				await new Promise((resolve) => setTimeout(resolve, 5));

				return calls;
			},
		});

		const [first, second, third] = await Promise.all([container.resolveAsync(AsyncCounterToken), container.resolveAsync(AsyncCounterToken), container.resolveAsync(AsyncCounterToken)]);

		expect(first).toBe(1);
		expect(second).toBe(1);
		expect(third).toBe(1);
		expect(calls).toBe(1);
	});

	it("throws a dedicated circular dependency error", () => {
		const container = new DIContainer();

		container.register({
			deps: [CircularRightToken],
			provide: CircularLeftToken,
			useFactory: (right: string) => `left:${right}`,
		});
		container.register({
			deps: [CircularLeftToken],
			provide: CircularRightToken,
			useFactory: (left: string) => `right:${left}`,
		});

		expect(() => container.resolve(CircularLeftToken)).toThrow("Circular dependency detected");
	});

	it("defers dependency resolution through lazy providers", async () => {
		let calls = 0;
		const container = new DIContainer();
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedCounterToken,
			useFactory: () => ({ value: ++calls }),
		});
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: LazyScopedResolverToken,
			useLazy: ScopedCounterToken,
		});
		const childScope = container.createScope("lazy-contract");
		const rootLazyResolver = container.resolve(LazyScopedResolverToken);
		const childLazyResolver = childScope.resolve(LazyScopedResolverToken);
		const rootFirst = await rootLazyResolver();
		const rootSecond = await rootLazyResolver();
		const childFirst = await childLazyResolver();

		expect(rootFirst).toBe(rootSecond);
		expect(childFirst).not.toBe(rootFirst);
	});

	it("runs lifecycle hooks with sync and cache semantics", () => {
		const container = new DIContainer();
		let onInitCalls = 0;
		let afterResolveCalls = 0;
		container.register({
			afterResolve: () => {
				afterResolveCalls += 1;
			},
			lifecycle: EDependencyLifecycle.SINGLETON,
			onInit: () => {
				onInitCalls += 1;
			},
			provide: HookContractToken,
			useFactory: () => ({ value: 1 }),
		});

		const first = container.resolve(HookContractToken);
		const second = container.resolve(HookContractToken);

		expect(first).toBe(second);
		expect(onInitCalls).toBe(1);
		expect(afterResolveCalls).toBe(2);
	});
});
