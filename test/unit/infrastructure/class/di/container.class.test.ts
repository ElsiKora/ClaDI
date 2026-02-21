import type { IResolveInterceptor } from "@domain/interface";
import type { Provider, Token } from "@domain/type";

import { EDependencyLifecycle, EDiContainerCaptiveDependencyPolicy, EDiContainerDuplicateProviderPolicy, EProviderType } from "@domain/enum";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseError } from "@infrastructure/class/base";
import { DIContainer } from "@infrastructure/class/di";
import { createToken } from "@presentation/utility/create";

const ValueToken = createToken<number>("Value");
const ServiceToken = createToken<ExampleService>("ExampleService");
const AliasToken = createToken<ExampleService>("AliasService");
const AliasChainLevelOneToken = createToken<number>("AliasChainLevelOne");
const AliasChainLevelTwoToken = createToken<number>("AliasChainLevelTwo");
const AliasChainLevelThreeToken = createToken<number>("AliasChainLevelThree");
const MultiBindingToken = createToken<{ id: string }>("MultiBinding");
const AsyncToken = createToken<number>("AsyncValue");
const AsyncThenableToken = createToken<number>("AsyncThenableValue");
const AsyncMultiBindingToken = createToken<number>("AsyncMultiBinding");
const AsyncScopedRaceToken = createToken<{ id: number }>("AsyncScopedRace");
const AsyncReregisterToken = createToken<string>("AsyncReregister");
const ScopedToken = createToken<{ id: string }>("ScopedValue");
const ScopedOverrideToken = createToken<{ owner: string }>("ScopedOverride");
const ResolveOptionalMissingToken = createToken<string>("ResolveOptionalMissing");
const SyncReregisterToken = createToken<string>("SyncReregister");
const MultiBindingConflictToken = createToken<number>("MultiBindingConflict");
const TransientToken = createToken<{ id: string }>("TransientValue");
const CircularAToken = createToken<string>("CircularA");
const CircularBToken = createToken<string>("CircularB");
const DuplicatePolicyToken = createToken<number>("DuplicatePolicy");
const CaptiveScopedToken = createToken<{ id: string }>("CaptiveScoped");
const CaptiveSingletonToken = createToken<{ scoped: { id: string } }>("CaptiveSingleton");
const InvalidFactoryToken = createToken<number>("InvalidFactory");
const InvalidClassToken = createToken<{ id: string }>("InvalidClass");
const InvalidOnDisposeToken = createToken<number>("InvalidOnDispose");
const OverwriteCleanupToken = createToken<{ close: () => void; id: string }>("OverwriteCleanup");
const OverwriteCleanupBarrierToken = createToken<{ id: string }>("OverwriteCleanupBarrier");
const ScopedNameToken = createToken<number>("ScopedName");
const SingletonOverrideToken = createToken<{ owner: string }>("SingletonOverride");
const DisposeRaceToken = createToken<{ close: () => void; id: string }>("DisposeRace");
const ValidateMissingDependencyToken = createToken<string>("ValidateMissingDependency");
const LazyResolverToken = createToken<() => Promise<number>>("LazyResolver");
const ScopedLazyResolverToken = createToken<() => Promise<{ id: string }>>("ScopedLazyResolver");
const HookedSingletonToken = createToken<{ id: number }>("HookedSingleton");
const AsyncOnInitToken = createToken<{ id: string }>("AsyncOnInit");
const AsyncAfterResolveToken = createToken<number>("AsyncAfterResolve");
const ThenableOnInitToken = createToken<number>("ThenableOnInit");
const InvalidAfterResolveToken = createToken<number>("InvalidAfterResolve");
const InvalidOnInitToken = createToken<number>("InvalidOnInit");
const UnregisterCleanupFailureToken = createToken<{ id: string }>("UnregisterCleanupFailure");

class ExampleService {
	constructor(private readonly value: number) {}

	public getValue(): number {
		return this.value;
	}
}

describe("DIContainer", () => {
	let container: DIContainer;

	beforeEach(() => {
		container = new DIContainer();
	});

	it("registers and resolves value providers", () => {
		container.register({ provide: ValueToken, useValue: 42 });

		expect(container.resolve(ValueToken)).toBe(42);
		expect(container.has(ValueToken)).toBe(true);
	});

	it("registers providers from array input", () => {
		container.register([
			{ provide: ValueToken, useValue: 7 },
			{ provide: DuplicatePolicyToken, useValue: 9 },
		]);

		expect(container.resolve(ValueToken)).toBe(7);
		expect(container.resolve(DuplicatePolicyToken)).toBe(9);
	});

	it("resolves class providers with dependencies", () => {
		container.register({ provide: ValueToken, useValue: 7 });
		container.register({
			deps: [ValueToken],
			provide: ServiceToken,
			useClass: ExampleService,
		});

		const service = container.resolve(ServiceToken);
		expect(service).toBeInstanceOf(ExampleService);
		expect(service.getValue()).toBe(7);
	});

	it("supports alias providers", () => {
		container.register({ provide: ValueToken, useValue: 9 });
		container.register({
			deps: [ValueToken],
			provide: ServiceToken,
			useClass: ExampleService,
		});
		container.register({ provide: AliasToken, useExisting: ServiceToken });

		expect(container.resolve(AliasToken).getValue()).toBe(9);
	});

	it("resolves alias chains with three links", () => {
		container.register({ provide: ValueToken, useValue: 77 });
		container.register({ provide: AliasChainLevelThreeToken, useExisting: ValueToken });
		container.register({ provide: AliasChainLevelTwoToken, useExisting: AliasChainLevelThreeToken });
		container.register({ provide: AliasChainLevelOneToken, useExisting: AliasChainLevelTwoToken });

		expect(container.resolve(AliasChainLevelOneToken)).toBe(77);
	});

	it("returns undefined from resolveOptional when token is not registered", () => {
		expect(container.resolveOptional(ResolveOptionalMissingToken)).toBeUndefined();
	});

	it("returns resolved value from resolveOptional when token exists", () => {
		container.register({ provide: ValueToken, useValue: 42 });

		expect(container.resolveOptional(ValueToken)).toBe(42);
	});

	it("returns undefined from resolveOptionalAsync when token is not registered", async () => {
		await expect(container.resolveOptionalAsync(ResolveOptionalMissingToken)).resolves.toBeUndefined();
	});

	it("returns resolved value from resolveOptionalAsync when token exists", async () => {
		container.register({ provide: ValueToken, useValue: 42 });

		await expect(container.resolveOptionalAsync(ValueToken)).resolves.toBe(42);
	});

	it("supports lazy provider strategy with deferred resolution", async () => {
		let calls = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: ValueToken,
			useFactory: () => {
				calls += 1;

				return 73;
			},
		});
		container.register({
			provide: LazyResolverToken,
			useLazy: ValueToken,
		});

		const lazyResolver = container.resolve(LazyResolverToken);

		expect(calls).toBe(0);
		await expect(lazyResolver()).resolves.toBe(73);
		await expect(lazyResolver()).resolves.toBe(73);
		expect(calls).toBe(1);
	});

	it("resolves lazy providers against the owning request scope", async () => {
		let sequence = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedToken,
			useFactory: () => ({ id: `scoped-${String(++sequence)}` }),
		});
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedLazyResolverToken,
			useLazy: ScopedToken,
		});
		const childScope = container.createScope("lazy-child");
		const rootLazyResolver = container.resolve(ScopedLazyResolverToken);
		const childLazyResolver = childScope.resolve(ScopedLazyResolverToken);
		const rootFirst = await rootLazyResolver();
		const rootSecond = await rootLazyResolver();
		const childFirst = await childLazyResolver();
		const childSecond = await childLazyResolver();

		expect(rootFirst).toBe(rootSecond);
		expect(childFirst).toBe(childSecond);
		expect(rootFirst).not.toBe(childFirst);
	});

	it("returns only local registered tokens from getRegisteredTokens", () => {
		const childScope = container.createScope("child");
		container.register({ provide: ValueToken, useValue: 1 });
		childScope.register({ provide: DuplicatePolicyToken, useValue: 2 });

		expect(container.getRegisteredTokens()).toEqual([ValueToken]);
		expect(childScope.getRegisteredTokens()).toEqual([DuplicatePolicyToken]);
	});

	it("overwrites duplicate provider registration by default", () => {
		container.register({ provide: DuplicatePolicyToken, useValue: 1 });
		container.register({ provide: DuplicatePolicyToken, useValue: 2 });

		expect(container.resolve(DuplicatePolicyToken)).toBe(2);
	});

	it("throws on duplicate provider registration in strict mode", () => {
		const strictContainer = new DIContainer({
			duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy.ERROR,
		});

		strictContainer.register({ provide: DuplicatePolicyToken, useValue: 1 });
		expect(() => strictContainer.register({ provide: DuplicatePolicyToken, useValue: 2 })).toThrow("Provider with token already registered in scope");
	});

	it("warns on duplicate provider registration in warn mode", () => {
		const warnLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const warnContainer = new DIContainer({
			duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy.WARN,
			logger: warnLogger,
		});

		warnContainer.register({ provide: DuplicatePolicyToken, useValue: 1 });
		warnContainer.register({ provide: DuplicatePolicyToken, useValue: 2 });

		expect(warnLogger.warn).toHaveBeenCalledTimes(1);
		expect(warnContainer.resolve(DuplicatePolicyToken)).toBe(2);
	});

	it("supports overriding duplicate provider policy for child scopes", () => {
		const childScope = container.createScope("strict-child", {
			duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy.ERROR,
		});

		childScope.register({ provide: DuplicatePolicyToken, useValue: 1 });
		expect(() => childScope.register({ provide: DuplicatePolicyToken, useValue: 2 })).toThrow("Provider with token already registered in scope");
	});

	it("invokes resolve interceptors for sync resolve and optional resolve", () => {
		const onErrorSpy = vi.fn();
		const onStartSpy = vi.fn();
		const onSuccessSpy = vi.fn();
		const resolveInterceptor: IResolveInterceptor = {
			onError: onErrorSpy,
			onStart: onStartSpy,
			onSuccess: onSuccessSpy,
		};
		const interceptedContainer = new DIContainer({
			resolveInterceptors: [resolveInterceptor],
		});
		interceptedContainer.register({ provide: ValueToken, useValue: 42 });

		expect(interceptedContainer.resolve(ValueToken)).toBe(42);
		expect(interceptedContainer.resolveOptional(ResolveOptionalMissingToken)).toBeUndefined();
		expect(onStartSpy).toHaveBeenCalledTimes(2);
		expect(onSuccessSpy).toHaveBeenCalledTimes(2);
		expect(onErrorSpy).toHaveBeenCalledTimes(0);
		expect(onStartSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				isAsync: false,
				isOptional: false,
				isResolveAll: false,
				tokenDescription: "Symbol(Value)",
			}),
		);
		expect(onSuccessSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				isAsync: false,
				isOptional: true,
				isResolveAll: false,
				result: undefined,
				tokenDescription: "Symbol(ResolveOptionalMissing)",
			}),
		);
	});

	it("invokes resolve interceptors for async and multi resolves", async () => {
		const onStartSpy = vi.fn();
		const onSuccessSpy = vi.fn();
		const interceptedContainer = new DIContainer({
			resolveInterceptors: [{ onStart: onStartSpy, onSuccess: onSuccessSpy }],
		});
		interceptedContainer.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncMultiBindingToken,
			useFactory: async () => 1,
		});
		interceptedContainer.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncMultiBindingToken,
			useFactory: async () => 2,
		});

		await expect(interceptedContainer.resolveAllAsync(AsyncMultiBindingToken)).resolves.toEqual([1, 2]);
		expect(onStartSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				isAsync: true,
				isResolveAll: true,
				tokenDescription: "Symbol(AsyncMultiBinding)",
			}),
		);
		expect(onSuccessSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				isAsync: true,
				isResolveAll: true,
				result: [1, 2],
				tokenDescription: "Symbol(AsyncMultiBinding)",
			}),
		);
	});

	it("supports overriding resolve interceptors for child scopes", () => {
		const parentOnStartSpy = vi.fn();
		const childOnStartSpy = vi.fn();
		const parentContainer = new DIContainer({
			resolveInterceptors: [{ onStart: parentOnStartSpy }],
		});
		parentContainer.register({ provide: ValueToken, useValue: 42 });
		const childScope = parentContainer.createScope("child-scope", {
			resolveInterceptors: [{ onStart: childOnStartSpy }],
		});

		expect(childScope.resolve(ValueToken)).toBe(42);
		expect(childOnStartSpy).toHaveBeenCalledTimes(1);
		expect(parentOnStartSpy).toHaveBeenCalledTimes(0);
	});

	it("does not fail resolution when interceptor callback throws", () => {
		const logger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const interceptedContainer = new DIContainer({
			logger,
			resolveInterceptors: [
				{
					onStart: () => {
						throw new Error("interceptor failure");
					},
				},
			],
		});
		interceptedContainer.register({ provide: ValueToken, useValue: 11 });

		expect(interceptedContainer.resolve(ValueToken)).toBe(11);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	it("invokes resolve interceptor onError callback on resolution failure", () => {
		const onErrorSpy = vi.fn();
		const interceptedContainer = new DIContainer({
			resolveInterceptors: [{ onError: onErrorSpy }],
		});

		expect(() => interceptedContainer.resolve(ResolveOptionalMissingToken)).toThrow("Token not found in container");
		expect(onErrorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				isAsync: false,
				isOptional: false,
				isResolveAll: false,
				tokenDescription: "Symbol(ResolveOptionalMissing)",
			}),
		);
	});

	it("registers multiple providers for one token and resolves all values", () => {
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "first" }),
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "second" }),
		});

		const resolvedValues = container.resolveAll(MultiBindingToken);

		expect(resolvedValues).toHaveLength(2);
		expect(resolvedValues.map((value: { id: string }) => value.id)).toEqual(["first", "second"]);
	});

	it("reports scoped cache presence in explain for scoped multi-binding providers", async () => {
		container.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "first" }),
		});
		container.register({
			isMultiBinding: true,
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "second" }),
		});
		const requestScope = container.createScope("multi-explain");

		expect(requestScope.explain(MultiBindingToken).hasScopeCache).toBe(false);
		requestScope.resolveAll(MultiBindingToken);
		expect(requestScope.explain(MultiBindingToken).hasScopeCache).toBe(true);
		await requestScope.dispose();
	});

	it("supports async multi-binding resolution", async () => {
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			isMultiBinding: true,
			provide: AsyncMultiBindingToken,
			useFactory: async () => 1,
		});
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			isMultiBinding: true,
			provide: AsyncMultiBindingToken,
			useFactory: async () => 2,
		});

		await expect(container.resolveAllAsync(AsyncMultiBindingToken)).resolves.toEqual([1, 2]);
	});

	it("throws when resolving multi-bound token via resolve", () => {
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "first" }),
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "second" }),
		});

		expect(() => container.resolve(MultiBindingToken)).toThrow("Token has multiple providers; use resolveAll() or resolveAllAsync()");
	});

	it("throws when resolving multi-bound token via resolveOptionalAsync", async () => {
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "first" }),
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "second" }),
		});

		await expect(container.resolveOptionalAsync(MultiBindingToken)).rejects.toThrow("Token has multiple providers; use resolveAll() or resolveAllAsync()");
	});

	it("throws on mixed multi-binding and single-binding providers for one token", () => {
		container.register({
			isMultiBinding: true,
			provide: MultiBindingConflictToken,
			useValue: 1,
		});

		expect(() => container.register({ provide: MultiBindingConflictToken, useValue: 2 })).toThrow("Token cannot mix multi-binding and single-binding providers");
	});

	it("throws when adding multi-binding provider to existing single-binding token", () => {
		container.register({ provide: MultiBindingConflictToken, useValue: 1 });

		expect(() =>
			container.register({
				isMultiBinding: true,
				provide: MultiBindingConflictToken,
				useValue: 2,
			}),
		).toThrow("Token cannot mix multi-binding and single-binding providers");
	});

	it("cleans up previous cached instance when provider is overwritten", async () => {
		const onDisposeSpy = vi.fn();
		const closeSpy = vi.fn();
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: onDisposeSpy,
			provide: OverwriteCleanupToken,
			useFactory: () => ({
				close: closeSpy,
				id: "v1",
			}),
		});
		const firstInstance = container.resolve(OverwriteCleanupToken);

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: OverwriteCleanupToken,
			useFactory: () => ({
				close: vi.fn(),
				id: "v2",
			}),
		});
		await Promise.resolve();

		const secondInstance = container.resolve(OverwriteCleanupToken);
		await container.dispose();

		expect(firstInstance.id).toBe("v1");
		expect(secondInstance.id).toBe("v2");
		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("blocks sync resolves while overwrite cleanup is in progress", async () => {
		let releaseCleanup: (() => void) | undefined;
		const cleanupGate: Promise<void> = new Promise<void>((resolve: () => void) => {
			releaseCleanup = resolve;
		});
		const onDisposeSpy = vi.fn(async () => {
			await cleanupGate;
		});
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: onDisposeSpy,
			provide: OverwriteCleanupBarrierToken,
			useFactory: () => ({
				id: "v1",
			}),
		});
		expect(container.resolve(OverwriteCleanupBarrierToken).id).toBe("v1");
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: OverwriteCleanupBarrierToken,
			useFactory: () => ({
				id: "v2",
			}),
		});

		expect(() => container.resolve(OverwriteCleanupBarrierToken)).toThrow("Provider cleanup is in progress after overwrite");
		const pendingResolve: Promise<{ id: string }> = container.resolveAsync(OverwriteCleanupBarrierToken);
		await Promise.resolve();
		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		releaseCleanup?.();
		await expect(pendingResolve).resolves.toEqual({ id: "v2" });
	});

	it("cleans up descendant scoped instances for overwritten parent provider token", async () => {
		const onDisposeSpy = vi.fn();
		const closeSpy = vi.fn();
		const childScope = container.createScope("overwrite-child");
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			onDispose: onDisposeSpy,
			provide: OverwriteCleanupToken,
			useFactory: () => ({
				close: closeSpy,
				id: "child-scoped",
			}),
		});
		childScope.resolve(OverwriteCleanupToken);

		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: OverwriteCleanupToken,
			useFactory: () => ({
				close: vi.fn(),
				id: "replaced",
			}),
		});
		await Promise.resolve();

		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("throws on captive singleton dependency when policy is error", () => {
		const strictContainer = new DIContainer({
			captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy.ERROR,
		});

		strictContainer.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: CaptiveScopedToken,
			useFactory: () => ({ id: "scoped-instance" }),
		});
		strictContainer.register({
			deps: [CaptiveScopedToken],
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: CaptiveSingletonToken,
			useFactory: (scopedValue: { id: string }) => ({ scoped: scopedValue }),
		});

		expect(() => strictContainer.resolve(CaptiveSingletonToken)).toThrow("Singleton provider depends on non-singleton provider");
	});

	it("warns on captive singleton dependency when policy is warn", () => {
		const warnLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const warnContainer = new DIContainer({
			captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy.WARN,
			logger: warnLogger,
		});

		warnContainer.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: CaptiveScopedToken,
			useFactory: () => ({ id: "scoped-instance" }),
		});
		warnContainer.register({
			deps: [CaptiveScopedToken],
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: CaptiveSingletonToken,
			useFactory: (scopedValue: { id: string }) => ({ scoped: scopedValue }),
		});

		expect(() => warnContainer.resolve(CaptiveSingletonToken)).not.toThrow();
		expect(warnLogger.warn).toHaveBeenCalledTimes(1);
	});

	it("does not warn on captive singleton dependency when policy is disabled", () => {
		const disabledLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const disabledContainer = new DIContainer({
			captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy.DISABLED,
			logger: disabledLogger,
		});
		disabledContainer.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: CaptiveScopedToken,
			useFactory: () => ({ id: "scoped-instance" }),
		});
		disabledContainer.register({
			deps: [CaptiveScopedToken],
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: CaptiveSingletonToken,
			useFactory: (scopedValue: { id: string }) => ({ scoped: scopedValue }),
		});

		expect(() => disabledContainer.resolve(CaptiveSingletonToken)).not.toThrow();
		expect(disabledLogger.warn).toHaveBeenCalledTimes(0);
	});

	it("supports overriding captive dependency policy for child scopes", () => {
		const childScope = container.createScope("strict-captive-child", {
			captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy.ERROR,
		});
		childScope.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: CaptiveScopedToken,
			useFactory: () => ({ id: "scoped-instance" }),
		});
		childScope.register({
			deps: [CaptiveScopedToken],
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: CaptiveSingletonToken,
			useFactory: (scopedValue: { id: string }) => ({ scoped: scopedValue }),
		});

		expect(() => childScope.resolve(CaptiveSingletonToken)).toThrow("Singleton provider depends on non-singleton provider");
	});

	it("uses singleton lifecycle cache", () => {
		const factory = vi.fn(() => ({ createdAt: Date.now() }));
		const token = createToken<{ createdAt: number }>("SingletonFactory");

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: token,
			useFactory: factory,
		});

		const first = container.resolve(token);
		const second = container.resolve(token);

		expect(factory).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
	});

	it("isolates singleton cache per provider owner scope for overridden tokens", () => {
		const rootFactory = vi.fn(() => ({ owner: "root" }));
		const childFactory = vi.fn(() => ({ owner: "child" }));
		const childScope = container.createScope("child-scope");

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: SingletonOverrideToken,
			useFactory: rootFactory,
		});
		childScope.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: SingletonOverrideToken,
			useFactory: childFactory,
		});

		const rootInstance = container.resolve(SingletonOverrideToken);
		const childFirst = childScope.resolve(SingletonOverrideToken);
		const childSecond = childScope.resolve(SingletonOverrideToken);

		expect(rootFactory).toHaveBeenCalledTimes(1);
		expect(childFactory).toHaveBeenCalledTimes(1);
		expect(rootInstance.owner).toBe("root");
		expect(childFirst.owner).toBe("child");
		expect(childFirst).toBe(childSecond);
		expect(rootInstance).not.toBe(childFirst);
		expect(container.snapshot().singletonCacheSize).toBe(2);
	});

	it("uses scoped lifecycle cache per scope", () => {
		let sequence = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedToken,
			useFactory: () => ({ id: `scope-${String(++sequence)}` }),
		});

		const rootFirst = container.resolve(ScopedToken);
		const rootSecond = container.resolve(ScopedToken);
		const childScope = container.createScope("request-scope");
		const childFirst = childScope.resolve(ScopedToken);
		const childSecond = childScope.resolve(ScopedToken);

		expect(rootFirst).toBe(rootSecond);
		expect(childFirst).toBe(childSecond);
		expect(rootFirst).not.toBe(childFirst);
	});

	it("does not clear sibling scoped caches when child scope overrides token", () => {
		let rootSequence = 0;
		let childSequence = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedOverrideToken,
			useFactory: () => ({ owner: `root-${String(++rootSequence)}` }),
		});

		const childScopeA = container.createScope("child-a");
		const childScopeB = container.createScope("child-b");
		const rootBefore = container.resolve(ScopedOverrideToken);
		const childABefore = childScopeA.resolve(ScopedOverrideToken);
		const childBBefore = childScopeB.resolve(ScopedOverrideToken);

		childScopeA.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedOverrideToken,
			useFactory: () => ({ owner: `child-a-${String(++childSequence)}` }),
		});

		const rootAfter = container.resolve(ScopedOverrideToken);
		const childAAfter = childScopeA.resolve(ScopedOverrideToken);
		const childBAfter = childScopeB.resolve(ScopedOverrideToken);

		expect(rootAfter).toBe(rootBefore);
		expect(childBAfter).toBe(childBBefore);
		expect(childAAfter).not.toBe(childABefore);
		expect(childAAfter.owner).toContain("child-a-");
	});

	it("does not clear child override scoped cache when parent re-registers token", () => {
		let rootSequence = 0;
		let childSequence = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedOverrideToken,
			useFactory: () => ({ owner: `root-${String(++rootSequence)}` }),
		});
		const childScope = container.createScope("child");
		childScope.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedOverrideToken,
			useFactory: () => ({ owner: `child-${String(++childSequence)}` }),
		});

		const childBefore = childScope.resolve(ScopedOverrideToken);
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: ScopedOverrideToken,
			useFactory: () => ({ owner: `root-reregister-${String(++rootSequence)}` }),
		});
		const childAfter = childScope.resolve(ScopedOverrideToken);

		expect(childBefore).toBe(childAfter);
		expect(childAfter.owner).toContain("child-");
		expect(rootSequence).toBe(0);
		expect(childSequence).toBe(1);
	});

	it("uses transient lifecycle without cache", () => {
		let sequence = 0;
		container.register({
			lifecycle: EDependencyLifecycle.TRANSIENT,
			provide: TransientToken,
			useFactory: () => ({ id: `instance-${String(++sequence)}` }),
		});

		const first = container.resolve(TransientToken);
		const second = container.resolve(TransientToken);

		expect(first).not.toBe(second);
	});

	it("requires resolveAsync for async providers", async () => {
		let asyncFactoryCalls = 0;
		container.register({
			provide: AsyncToken,
			useFactory: async () => {
				asyncFactoryCalls += 1;

				return 123;
			},
		});

		expect(() => container.resolve(AsyncToken)).toThrow("Use resolveAsync() for async providers");
		expect(asyncFactoryCalls).toBe(0);
		await expect(container.resolveAsync(AsyncToken)).resolves.toBe(123);
		expect(asyncFactoryCalls).toBe(1);
	});

	it("resolves async providers via resolveOptionalAsync", async () => {
		let asyncFactoryCalls = 0;
		container.register({
			provide: AsyncToken,
			useFactory: async () => {
				asyncFactoryCalls += 1;

				return 456;
			},
		});

		await expect(container.resolveOptionalAsync(AsyncToken)).resolves.toBe(456);
		expect(asyncFactoryCalls).toBe(1);
	});

	it("throws from resolve when factory returns thenable without async keyword", () => {
		let factoryCalls = 0;
		container.register({
			provide: AsyncThenableToken,
			useFactory: () => {
				factoryCalls += 1;

				return {
					then: (resolve: (value: number) => void): void => {
						resolve(999);
					},
				} as unknown as Promise<number>;
			},
		});

		expect(() => container.resolve(AsyncThenableToken)).toThrow("Use resolveAsync() for async providers");
		expect(factoryCalls).toBe(1);
	});

	it("deduplicates async singleton creation under race", async () => {
		let calls = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncToken,
			useFactory: async () => {
				calls += 1;
				await new Promise((resolve) => setTimeout(resolve, 10));

				return 55;
			},
		});

		const [first, second] = await Promise.all([container.resolveAsync(AsyncToken), container.resolveAsync(AsyncToken)]);

		expect(first).toBe(55);
		expect(second).toBe(55);
		expect(calls).toBe(1);
	});

	it("deduplicates concurrent async scoped creation per scope", async () => {
		let calls = 0;
		container.register({
			lifecycle: EDependencyLifecycle.SCOPED,
			provide: AsyncScopedRaceToken,
			useFactory: async () => {
				calls += 1;
				await new Promise((resolve) => setTimeout(resolve, 5));

				return { id: calls };
			},
		});
		const childScopeA = container.createScope("scope-a");
		const childScopeB = container.createScope("scope-b");

		const [aFirst, aSecond, bFirst, bSecond] = await Promise.all([childScopeA.resolveAsync(AsyncScopedRaceToken), childScopeA.resolveAsync(AsyncScopedRaceToken), childScopeB.resolveAsync(AsyncScopedRaceToken), childScopeB.resolveAsync(AsyncScopedRaceToken)]);

		expect(aFirst).toBe(aSecond);
		expect(bFirst).toBe(bSecond);
		expect(aFirst).not.toBe(bFirst);
		expect(calls).toBe(2);
	});

	it("waits for in-flight async resolve before disposal cleanup", async () => {
		const onDisposeSpy = vi.fn();
		const closeSpy = vi.fn();
		let releaseFactory: (() => void) | undefined;
		const factoryGate = new Promise<void>((resolve) => {
			releaseFactory = resolve;
		});
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: onDisposeSpy,
			provide: DisposeRaceToken,
			useFactory: async () => {
				await factoryGate;

				return {
					close: closeSpy,
					id: "resolved",
				};
			},
		});

		const pendingResolution = container.resolveAsync(DisposeRaceToken);
		const pendingDisposal = container.dispose();

		expect(() => container.resolve(DisposeRaceToken)).toThrow("Scope is disposing");
		releaseFactory?.();
		await expect(pendingResolution).resolves.toEqual({
			close: closeSpy,
			id: "resolved",
		});
		await expect(pendingDisposal).resolves.toBeUndefined();
		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("fails disposal when in-flight async resolutions exceed configured drain timeout", async () => {
		let releaseFactory: (() => void) | undefined;
		const timeoutContainer = new DIContainer({
			asyncResolutionDrainTimeoutMs: 5,
		});
		const timeoutToken = createToken<{ id: string }>("AsyncDrainTimeout");
		const factoryGate = new Promise<void>((resolve: () => void) => {
			releaseFactory = resolve;
		});
		timeoutContainer.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: timeoutToken,
			useFactory: async () => {
				await factoryGate;

				return { id: "ready" };
			},
		});
		const pendingResolution: Promise<{ id: string }> = timeoutContainer.resolveAsync(timeoutToken);

		await Promise.resolve();
		await expect(timeoutContainer.dispose()).rejects.toMatchObject({
			code: "SCOPE_DISPOSE_ASYNC_DRAIN_TIMEOUT",
		});
		expect(() => timeoutContainer.snapshot()).not.toThrow();
		releaseFactory?.();
		await expect(pendingResolution).resolves.toEqual({ id: "ready" });
		await expect(timeoutContainer.dispose()).resolves.toBeUndefined();
		expect(() => timeoutContainer.resolve(timeoutToken)).toThrow("Scope is already disposed");
	});

	it("does not commit stale async singleton value after provider re-registration", async () => {
		let releaseOldFactory: ((value: string) => void) | undefined;
		const oldFactoryPromise = new Promise<string>((resolve) => {
			releaseOldFactory = resolve;
		});

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncReregisterToken,
			useFactory: async () => await oldFactoryPromise,
		});

		const inFlightResolution = container.resolveAsync(AsyncReregisterToken);
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncReregisterToken,
			useValue: "new-value",
		});

		releaseOldFactory?.("old-value");
		await inFlightResolution;

		expect(container.resolve(AsyncReregisterToken)).toBe("new-value");
	});

	it("does not return stale async singleton to concurrent waiters after provider re-registration", async () => {
		let releaseOldFactory: ((value: string) => void) | undefined;
		const oldFactoryPromise = new Promise<string>((resolve) => {
			releaseOldFactory = resolve;
		});

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncReregisterToken,
			useFactory: async () => await oldFactoryPromise,
		});

		const firstResolution: Promise<string> = container.resolveAsync(AsyncReregisterToken);
		const secondResolution: Promise<string> = container.resolveAsync(AsyncReregisterToken);

		await Promise.resolve();
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncReregisterToken,
			useValue: "new-value",
		});
		releaseOldFactory?.("old-value");

		await expect(firstResolution).resolves.toBe("new-value");
		await expect(secondResolution).resolves.toBe("new-value");
	});

	it("does not commit stale sync singleton value after provider re-registration", () => {
		let shouldReregister = true;

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: SyncReregisterToken,
			useFactory: () => {
				if (shouldReregister) {
					shouldReregister = false;
					container.register({
						lifecycle: EDependencyLifecycle.SINGLETON,
						provide: SyncReregisterToken,
						useValue: "new-sync-value",
					});
				}

				return "old-sync-value";
			},
		});

		expect(container.resolve(SyncReregisterToken)).toBe("new-sync-value");
		expect(container.resolve(SyncReregisterToken)).toBe("new-sync-value");
	});

	it("disposes stale sync singleton instance when provider changes during construction", async () => {
		const staleSyncToken = createToken<{ close: () => void; id: string }>("StaleSyncCleanup");
		const onDisposeSpy = vi.fn();
		const closeSpy = vi.fn();
		let shouldReregister = true;
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: onDisposeSpy,
			provide: staleSyncToken,
			useFactory: () => {
				if (shouldReregister) {
					shouldReregister = false;
					container.register({
						lifecycle: EDependencyLifecycle.SINGLETON,
						provide: staleSyncToken,
						useValue: { close: vi.fn(), id: "new-sync" },
					});
				}

				return { close: closeSpy, id: "old-sync" };
			},
		});

		expect(container.resolve(staleSyncToken).id).toBe("new-sync");
		await Promise.resolve();
		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("detects circular dependencies via validate without resolve", () => {
		container.register({
			deps: [CircularBToken as Token<unknown>],
			provide: CircularAToken,
			useFactory: (bValue: unknown) => `A:${String(bValue)}`,
		});
		container.register({
			deps: [CircularAToken as Token<unknown>],
			provide: CircularBToken,
			useFactory: (aValue: unknown) => `B:${String(aValue)}`,
		});

		expect(() => container.validate()).toThrow("Circular dependency detected");
	});

	it("detects missing dependencies via validate without resolve", () => {
		container.register({
			deps: [ValidateMissingDependencyToken],
			provide: CircularAToken,
			useFactory: (value: string) => `A:${value}`,
		});

		expect(() => container.validate()).toThrow("Token not found in container");
	});

	it("detects multi-binding token misuse in provider deps via validate", () => {
		container.register({
			isMultiBinding: true,
			provide: MultiBindingConflictToken,
			useValue: 1,
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingConflictToken,
			useValue: 2,
		});
		container.register({
			deps: [MultiBindingConflictToken],
			provide: CircularAToken,
			useFactory: (value: number) => `A:${String(value)}`,
		});

		expect(() => container.validate()).toThrow("Token has multiple providers; use resolveAll() or resolveAllAsync()");
	});

	it("passes validate for valid dependency graph", () => {
		container.register({ provide: ValueToken, useValue: 42 });
		container.register({
			deps: [ValueToken],
			provide: ServiceToken,
			useClass: ExampleService,
		});

		expect(() => container.validate()).not.toThrow();
	});

	it("detects circular dependencies", () => {
		container.register({
			deps: [CircularBToken as Token<unknown>],
			provide: CircularAToken,
			useFactory: (bValue: unknown) => `A:${String(bValue)}`,
		});
		container.register({
			deps: [CircularAToken as Token<unknown>],
			provide: CircularBToken,
			useFactory: (aValue: unknown) => `B:${String(aValue)}`,
		});

		expect(() => container.resolve(CircularAToken)).toThrow("Circular dependency detected");
	});

	it("runs disposer hooks on scope disposal", async () => {
		const disposeSpy = vi.fn();
		const closeSpy = vi.fn();
		const disposeToken = createToken<{ close: () => void }>("DisposableValue");

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: disposeSpy,
			provide: disposeToken,
			useFactory: () => ({ close: closeSpy }),
		});

		container.resolve(disposeToken);
		await container.dispose();

		expect(disposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("runs Symbol.dispose callback on scope disposal when available", async () => {
		const symbolDispose: symbol | undefined = (Symbol as { dispose?: symbol }).dispose;

		if (!symbolDispose) {
			return;
		}

		const disposeSpy = vi.fn();
		const disposeToken = createToken<{ [key: symbol]: () => void }>("DisposableBySymbol");
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: disposeToken,
			useFactory: () => ({
				[symbolDispose]: disposeSpy,
			}),
		});

		container.resolve(disposeToken);
		await container.dispose();

		expect(disposeSpy).toHaveBeenCalledTimes(1);
	});

	it("runs Symbol.asyncDispose callback on scope disposal when available", async () => {
		const symbolAsyncDispose: symbol | undefined = (Symbol as { asyncDispose?: symbol }).asyncDispose;

		if (!symbolAsyncDispose) {
			return;
		}

		const asyncDisposeSpy = vi.fn(async () => undefined);
		const disposeToken = createToken<{ [key: symbol]: () => Promise<void> }>("AsyncDisposableBySymbol");
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: disposeToken,
			useFactory: () => ({
				[symbolAsyncDispose]: asyncDisposeSpy,
			}),
		});

		container.resolve(disposeToken);
		await container.dispose();

		expect(asyncDisposeSpy).toHaveBeenCalledTimes(1);
	});

	it("deduplicates concurrent dispose calls", async () => {
		const disposeSpy = vi.fn();
		const disposeToken = createToken<{ id: string }>("ConcurrentDispose");
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: disposeSpy,
			provide: disposeToken,
			useFactory: () => ({ id: "instance" }),
		});
		container.resolve(disposeToken);

		await Promise.all([container.dispose(), container.dispose()]);

		expect(disposeSpy).toHaveBeenCalledTimes(1);
	});

	it("runs all disposer callbacks for one provider even if one callback fails", async () => {
		const disposeSpy = vi.fn(() => {
			throw new Error("dispose callback failed");
		});
		const closeSpy = vi.fn();
		const disposeToken = createToken<{ close: () => void }>("DisposableWithFailure");

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: disposeSpy,
			provide: disposeToken,
			useFactory: () => ({ close: closeSpy }),
		});

		container.resolve(disposeToken);
		await expect(container.dispose()).rejects.toThrow("Scope disposed with cleanup errors");
		expect(disposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it("converts non-Error disposer failures to Error messages", async () => {
		const token = createToken<{ id: string }>("StringDisposerError");
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: async () => await Promise.reject("string-dispose-error"),
			provide: token,
			useFactory: () => ({ id: "instance" }),
		});
		container.resolve(token);

		try {
			await container.dispose();
			expect.unreachable("dispose should throw when disposer fails");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toContain("Scope disposed with cleanup errors");
		}
	});

	it("runs transient disposer callbacks on scope disposal", async () => {
		const disposeSpy = vi.fn();
		const closeSpy = vi.fn();
		const transientDisposeToken = createToken<{ close: () => void }>("TransientDisposable");

		container.register({
			lifecycle: EDependencyLifecycle.TRANSIENT,
			onDispose: disposeSpy,
			provide: transientDisposeToken,
			useFactory: () => ({ close: closeSpy }),
		});

		container.resolve(transientDisposeToken);
		container.resolve(transientDisposeToken);
		await container.dispose();

		expect(disposeSpy).toHaveBeenCalledTimes(2);
		expect(closeSpy).toHaveBeenCalledTimes(2);
	});

	it("continues cleanup and marks scope disposed even when one cleanup step fails", async () => {
		const childScope = container.createScope("child-scope");
		const childToken = createToken<{ id: string }>("ChildDisposable");
		const rootToken = createToken<{ close: () => void }>("RootDisposable");
		const rootOnDisposeSpy = vi.fn();
		const rootCloseSpy = vi.fn();

		childScope.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: () => {
				throw new Error("child cleanup failed");
			},
			provide: childToken,
			useFactory: () => ({ id: "child" }),
		});

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: rootOnDisposeSpy,
			provide: rootToken,
			useFactory: () => ({ close: rootCloseSpy }),
		});

		childScope.resolve(childToken);
		container.resolve(rootToken);

		await expect(container.dispose()).rejects.toThrow("Scope disposed with cleanup errors");
		expect(rootOnDisposeSpy).toHaveBeenCalledTimes(1);
		expect(rootCloseSpy).toHaveBeenCalledTimes(1);
		expect(() => container.resolve(rootToken)).toThrow("Scope is already disposed");
	});

	it("clears root singleton cache entries when disposing child scope", async () => {
		const childScope = container.createScope("child-scope");
		const childSingletonToken = createToken<{ id: string }>("ChildSingleton");
		const childOnDisposeSpy = vi.fn();

		childScope.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: childOnDisposeSpy,
			provide: childSingletonToken,
			useFactory: () => ({ id: "child-instance" }),
		});

		childScope.resolve(childSingletonToken);
		expect(container.snapshot().singletonCacheSize).toBe(1);

		await childScope.dispose();
		expect(childOnDisposeSpy).toHaveBeenCalledTimes(1);
		expect(container.snapshot().singletonCacheSize).toBe(0);
	});

	it("throws SCOPE_DISPOSED from stateful APIs after disposal", async () => {
		const postDisposeToken = createToken<number>("PostDisposeToken");
		container.register({ provide: postDisposeToken, useValue: 1 });

		await container.dispose();

		const postDisposeOperations: Array<() => unknown> = [() => container.register({ provide: postDisposeToken, useValue: 2 }), () => container.createScope("post-dispose-child"), () => container.has(postDisposeToken), () => container.explain(postDisposeToken), () => container.snapshot(), () => container.validate(), () => container.getRegisteredTokens()];

		for (const postDisposeOperation of postDisposeOperations) {
			expect(postDisposeOperation).toThrow("Scope is already disposed");
		}
	});

	it("unregisters providers and disposes cached instances", async () => {
		const unregisterToken = createToken<{ close: () => void; id: string }>("UnregisterToken");
		const onDisposeSpy = vi.fn();
		const closeSpy = vi.fn();
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: onDisposeSpy,
			provide: unregisterToken,
			useFactory: () => ({ close: closeSpy, id: "instance" }),
		});
		expect(container.resolve(unregisterToken).id).toBe("instance");

		await expect(container.unregister(unregisterToken)).resolves.toBe(true);
		expect(container.has(unregisterToken)).toBe(false);
		expect(container.resolveOptional(unregisterToken)).toBeUndefined();
		expect(onDisposeSpy).toHaveBeenCalledTimes(1);
		expect(closeSpy).toHaveBeenCalledTimes(1);
		await expect(container.unregister(unregisterToken)).resolves.toBe(false);
	});

	it("keeps provider unregistered when cleanup fails during unregister", async () => {
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: () => {
				throw new Error("unregister cleanup failed");
			},
			provide: UnregisterCleanupFailureToken,
			useFactory: () => ({ id: "broken" }),
		});
		expect(container.resolve(UnregisterCleanupFailureToken).id).toBe("broken");

		await expect(container.unregister(UnregisterCleanupFailureToken)).rejects.toMatchObject({
			code: "PROVIDER_UNREGISTER_CLEANUP_FAILED",
		});
		expect(container.has(UnregisterCleanupFailureToken)).toBe(false);
		expect(container.resolveOptional(UnregisterCleanupFailureToken)).toBeUndefined();
		await expect(container.dispose()).resolves.toBeUndefined();
	});

	it("disposes nested scope tree and runs each scope cleanup exactly once", async () => {
		const disposalTrace: Array<string> = [];
		const rootToken = createToken<{ id: string }>("NestedDisposeRoot");
		const childScope = container.createScope("nested-child");
		const childToken = createToken<{ id: string }>("NestedDisposeChild");
		const grandChildScope = childScope.createScope("nested-grandchild");
		const grandChildToken = createToken<{ id: string }>("NestedDisposeGrandChild");

		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: () => {
				disposalTrace.push("root");
			},
			provide: rootToken,
			useFactory: () => ({ id: "root" }),
		});
		childScope.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: () => {
				disposalTrace.push("child");
			},
			provide: childToken,
			useFactory: () => ({ id: "child" }),
		});
		grandChildScope.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			onDispose: () => {
				disposalTrace.push("grandchild");
			},
			provide: grandChildToken,
			useFactory: () => ({ id: "grandchild" }),
		});
		container.resolve(rootToken);
		childScope.resolve(childToken);
		grandChildScope.resolve(grandChildToken);

		await container.dispose();

		expect(disposalTrace).toHaveLength(3);
		expect(disposalTrace).toContain("root");
		expect(disposalTrace).toContain("child");
		expect(disposalTrace).toContain("grandchild");
	});

	it("uses generated id when scope name is blank", () => {
		container.register({ provide: ScopedNameToken, useValue: 1 });
		const blankNamedScope = container.createScope("   ");

		expect(blankNamedScope.id).toMatch(/^scope-\d+$/);
	});

	it("keeps scope id counters isolated per root container", async () => {
		const firstRoot = new DIContainer();
		const secondRoot = new DIContainer();
		const firstChild = firstRoot.createScope();
		const secondChild = secondRoot.createScope();

		expect(firstRoot.id).toBe("scope-1");
		expect(secondRoot.id).toBe("scope-1");
		expect(firstChild.id).toBe("scope-2");
		expect(secondChild.id).toBe("scope-2");
		await firstChild.dispose();
		await secondChild.dispose();
		await firstRoot.dispose();
		await secondRoot.dispose();
	});

	it("validates provider runtime shape for factory providers", () => {
		expect(() =>
			container.register({
				provide: InvalidFactoryToken,
				useFactory: "invalid-factory" as unknown as (...arguments_: Array<never>) => number,
			}),
		).toThrow("Factory provider useFactory must be a function");
	});

	it("throws TOKEN_NOT_SYMBOL when provider token is not a symbol", () => {
		try {
			container.register({
				provide: "invalid-token" as unknown as Token<number>,
				useValue: 1,
			});
			expect.unreachable("register should throw when token is not a symbol");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("TOKEN_NOT_SYMBOL");
			expect((error as Error).message).toContain("Token must be a symbol");
		}
	});

	it("throws PROVIDER_INVALID_STRATEGY when provider defines multiple strategies", () => {
		try {
			container.register({
				provide: InvalidFactoryToken,
				useFactory: () => 1,
				useValue: 1,
			} as unknown as Provider);
			expect.unreachable("register should throw when provider has multiple strategies");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("PROVIDER_INVALID_STRATEGY");
			expect((error as Error).message).toContain("Provider must define exactly one strategy");
		}
	});

	it("throws PROVIDER_DEPS_NOT_ARRAY when deps is not an array", () => {
		try {
			container.register({
				deps: "invalid-deps" as unknown as ReadonlyArray<Token<unknown>>,
				provide: InvalidClassToken,
				useClass: ExampleService as unknown as new (...arguments_: Array<never>) => { id: string },
			} as unknown as Provider);
			expect.unreachable("register should throw when deps is not an array");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("PROVIDER_DEPS_NOT_ARRAY");
			expect((error as Error).message).toContain("Provider deps must be an array");
		}
	});

	it("throws PROVIDER_DEPS_SPARSE when deps has sparse indexes", () => {
		try {
			container.register({
				deps: [ValueToken, , DuplicatePolicyToken] as unknown as ReadonlyArray<Token<unknown>>,
				provide: InvalidClassToken,
				useClass: ExampleService as unknown as new (...arguments_: Array<never>) => { id: string },
			} as unknown as Provider);
			expect.unreachable("register should throw when deps is sparse");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("PROVIDER_DEPS_SPARSE");
			expect((error as Error).message).toContain("Provider deps has sparse dependency indexes");
		}
	});

	it("warns when provider deps count does not match factory parameter count", () => {
		const warnLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			trace: vi.fn(),
			warn: vi.fn(),
		};
		const warnContainer = new DIContainer({
			logger: warnLogger,
		});
		const mismatchToken = createToken<number>("MismatchDeps");
		const firstDep = createToken<number>("MismatchDepFirst");
		const secondDep = createToken<number>("MismatchDepSecond");
		warnContainer.register({ provide: firstDep, useValue: 1 });
		warnContainer.register({ provide: secondDep, useValue: 2 });
		warnContainer.register({
			deps: [firstDep, secondDep],
			provide: mismatchToken,
			useFactory: (first: number) => first,
		});

		expect(warnLogger.warn).toHaveBeenCalledTimes(1);
		expect(warnContainer.resolve(mismatchToken)).toBe(1);
	});

	it("validates provider runtime shape for constructable class providers", () => {
		expect(() =>
			container.register({
				provide: InvalidClassToken,
				useClass: (() => ({ id: "invalid" })) as unknown as new (...arguments_: Array<never>) => { id: string },
			}),
		).toThrow("Class provider useClass must be a constructable class");
	});

	it("validates provider runtime shape for onDispose callback", () => {
		expect(() =>
			container.register({
				onDispose: "invalid-disposer" as unknown as (instance: number) => void,
				provide: InvalidOnDisposeToken,
				useValue: 1,
			}),
		).toThrow("Provider onDispose must be a function");
	});

	it("validates provider runtime shape for onInit callback", () => {
		expect(() =>
			container.register({
				onInit: "invalid-on-init" as unknown as (instance: number) => void,
				provide: InvalidOnInitToken,
				useValue: 1,
			}),
		).toThrow("Provider onInit must be a function");
	});

	it("validates provider runtime shape for afterResolve callback", () => {
		expect(() =>
			container.register({
				afterResolve: "invalid-after-resolve" as unknown as (instance: number) => void,
				provide: InvalidAfterResolveToken,
				useValue: 1,
			}),
		).toThrow("Provider afterResolve must be a function");
	});

	it("runs onInit once and afterResolve on every successful resolve", () => {
		const onInitSpy = vi.fn();
		const afterResolveSpy = vi.fn();
		let createdCount = 0;
		container.register({
			afterResolve: afterResolveSpy,
			lifecycle: EDependencyLifecycle.SINGLETON,
			onInit: onInitSpy,
			provide: HookedSingletonToken,
			useFactory: () => ({ id: ++createdCount }),
		});

		const first = container.resolve(HookedSingletonToken);
		const second = container.resolve(HookedSingletonToken);

		expect(first).toBe(second);
		expect(onInitSpy).toHaveBeenCalledTimes(1);
		expect(afterResolveSpy).toHaveBeenCalledTimes(2);
	});

	it("throws PROVIDER_HOOK_FAILED when onInit throws", () => {
		container.register({
			onInit: () => {
				throw new Error("onInit exploded");
			},
			provide: HookedSingletonToken,
			useFactory: () => ({ id: 1 }),
		});

		try {
			container.resolve(HookedSingletonToken);
			expect.unreachable("resolve should throw when onInit throws");
		} catch (error) {
			expect(error).toBeInstanceOf(BaseError);
			expect((error as BaseError).code).toBe("PROVIDER_HOOK_FAILED");
			expect((error as Error).message).toContain("Provider onInit hook failed");
		}
	});

	it("throws PROVIDER_STALE_REGISTRATION when resolveAllAsync detects stale registration", async () => {
		const staleResolveAllToken = createToken<string>("StaleResolveAll");
		let releaseCreation: (() => void) | undefined;
		const waitForRelease: Promise<void> = new Promise<void>((resolve: () => void) => {
			releaseCreation = resolve;
		});
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: staleResolveAllToken,
			useFactory: async () => {
				await waitForRelease;

				return "first";
			},
		});
		const pendingResolution: Promise<Array<string>> = container.resolveAllAsync(staleResolveAllToken);

		await Promise.resolve();
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: staleResolveAllToken,
			useFactory: async () => "second",
		});
		releaseCreation?.();
		await expect(pendingResolution).rejects.toMatchObject({
			code: "PROVIDER_STALE_REGISTRATION",
		});
	});

	it("requires resolveAsync when onInit hook is async", async () => {
		container.register({
			onInit: async () => undefined,
			provide: AsyncOnInitToken,
			useFactory: () => ({ id: "async-init" }),
		});

		expect(() => container.resolve(AsyncOnInitToken)).toThrow("Provider onInit hook requires resolveAsync()");
		await expect(container.resolveAsync(AsyncOnInitToken)).resolves.toEqual({ id: "async-init" });
	});

	it("requires resolveAsync when onInit hook returns a thenable", async () => {
		container.register({
			onInit: () =>
				({
					then: (resolve: () => void): void => {
						resolve();
					},
				}) as unknown as Promise<void>,
			provide: ThenableOnInitToken,
			useValue: 1,
		});

		expect(() => container.resolve(ThenableOnInitToken)).toThrow("Provider onInit hook requires resolveAsync()");
		await expect(container.resolveAsync(ThenableOnInitToken)).resolves.toBe(1);
	});

	it("requires resolveAsync when afterResolve hook is async", async () => {
		container.register({
			afterResolve: async () => undefined,
			provide: AsyncAfterResolveToken,
			useValue: 10,
		});

		expect(() => container.resolve(AsyncAfterResolveToken)).toThrow("Provider afterResolve hook requires resolveAsync()");
		await expect(container.resolveAsync(AsyncAfterResolveToken)).resolves.toBe(10);
	});

	it("returns isFound false from explain when token is not registered", () => {
		const missingExplainToken = createToken<number>("MissingExplainToken");
		const explanation = container.explain(missingExplainToken);

		expect(explanation.isFound).toBe(false);
		expect(explanation.dependencies).toEqual([]);
		expect(explanation.lookupPath).toContain(container.id);
		expect(explanation.token).toBe("Symbol(MissingExplainToken)");
	});

	it("returns diagnostics via explain and snapshot", () => {
		container.register({ provide: ValueToken, useValue: 1 });
		container.resolve(ValueToken);
		const explanation = container.explain(ValueToken);
		const snapshot = container.snapshot();

		expect(explanation.isFound).toBe(true);
		expect(explanation.providerType).toBe(EProviderType.VALUE);
		expect(explanation.isAsyncFactory).toBe(false);
		expect(snapshot.providerCount).toBeGreaterThanOrEqual(1);
		expect(snapshot.tokens).toContain("Symbol(Value)");
		expect(snapshot.tokenRegistrations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					hasMultiBinding: false,
					registrationCount: 1,
					token: "Symbol(Value)",
				}),
			]),
		);
	});

	it("reports async factory and multi-binding diagnostics", () => {
		container.register({
			lifecycle: EDependencyLifecycle.SINGLETON,
			provide: AsyncToken,
			useFactory: async () => 1,
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "first" }),
		});
		container.register({
			isMultiBinding: true,
			provide: MultiBindingToken,
			useFactory: () => ({ id: "second" }),
		});

		const explanation = container.explain(AsyncToken);
		const snapshot = container.snapshot();

		expect(explanation.isAsyncFactory).toBe(true);
		expect(snapshot.tokenRegistrations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					hasMultiBinding: true,
					registrationCount: 2,
					token: "Symbol(MultiBinding)",
				}),
			]),
		);
	});
});
