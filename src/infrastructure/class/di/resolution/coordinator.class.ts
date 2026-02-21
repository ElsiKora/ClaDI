import type { IAliasProvider, IClassProvider, IFactoryProvider, ILazyProvider, IProviderBase, IValueProvider } from "@domain/interface";
import type { Provider, Token } from "@domain/type";
import type { DIContainer } from "@infrastructure/class/di/container.class";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle, EProviderType } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";
import { toError } from "@infrastructure/utility/to-error.utility";

const MAX_STALE_REGISTRATION_RETRIES: number = 10;

export class ResolutionCoordinator {
	private readonly ASSERT_KEY: <T>(dependencyKey: Token<T>) => symbol;

	private readonly ASSERT_SINGLE_BINDING_LOOKUP: (tokenSymbol: symbol, lookup: IProviderLookup<DIContainer>) => IProviderRegistration<unknown>;

	private readonly DESCRIBE_KEY: (dependencyKeySymbol: symbol) => string;

	private readonly ENSURE_ACTIVE: () => void;

	private readonly FIND_PROVIDER: (requestScope: DIContainer, dependencyKeySymbol: symbol) => IProviderLookup<DIContainer>;

	private readonly GET_SCOPED_CACHE_FOR_LIFECYCLE: (lifecycle: EDependencyLifecycle, requestScope: DIContainer, providerOwner: DIContainer) => Map<symbol, unknown> | undefined;

	private readonly IS_PROVIDER_CLEANUP_PENDING: (ownerScope: DIContainer, dependencyKeySymbol: symbol) => boolean;

	private readonly IS_REGISTRATION_CURRENT: (ownerScope: DIContainer, dependencyKeySymbol: symbol, registration: IProviderRegistration<unknown>) => boolean;

	private readonly REGISTER_DISPOSER: (
		disposerScope: DIContainer,
		provider: Provider,
		instance: unknown,
		dependencyKeySymbol: symbol,
		options?: {
			shouldTrack?: boolean;
		},
	) => (() => Promise<void>) | undefined;

	private readonly VALIDATE_CAPTIVE_DEPENDENCY: (parentRegistration: IProviderRegistration<unknown>, dependencyToken: Token<unknown>, resolutionScope: DIContainer) => void;

	private readonly WAIT_FOR_PROVIDER_CLEANUP: (ownerScope: DIContainer, dependencyKeySymbol: symbol) => Promise<void>;

	constructor(options: {
		assertKey: <T>(dependencyKey: Token<T>) => symbol;
		assertSingleBindingLookup: (tokenSymbol: symbol, lookup: IProviderLookup<DIContainer>) => IProviderRegistration<unknown>;
		describeKey: (dependencyKeySymbol: symbol) => string;
		ensureActive: () => void;
		findProvider: (requestScope: DIContainer, dependencyKeySymbol: symbol) => IProviderLookup<DIContainer>;
		getScopedCacheForLifecycle: (lifecycle: EDependencyLifecycle, requestScope: DIContainer, providerOwner: DIContainer) => Map<symbol, unknown> | undefined;
		isProviderCleanupPending: (ownerScope: DIContainer, dependencyKeySymbol: symbol) => boolean;
		isRegistrationCurrent: (ownerScope: DIContainer, dependencyKeySymbol: symbol, registration: IProviderRegistration<unknown>) => boolean;
		registerDisposer: (
			disposerScope: DIContainer,
			provider: Provider,
			instance: unknown,
			dependencyKeySymbol: symbol,
			options?: {
				shouldTrack?: boolean;
			},
		) => (() => Promise<void>) | undefined;
		validateCaptiveDependency: (parentRegistration: IProviderRegistration<unknown>, dependencyToken: Token<unknown>, resolutionScope: DIContainer) => void;
		waitForProviderCleanup: (ownerScope: DIContainer, dependencyKeySymbol: symbol) => Promise<void>;
	}) {
		this.ASSERT_KEY = options.assertKey;
		this.ASSERT_SINGLE_BINDING_LOOKUP = options.assertSingleBindingLookup;
		this.DESCRIBE_KEY = options.describeKey;
		this.ENSURE_ACTIVE = options.ensureActive;
		this.FIND_PROVIDER = options.findProvider;
		this.GET_SCOPED_CACHE_FOR_LIFECYCLE = options.getScopedCacheForLifecycle;
		this.IS_REGISTRATION_CURRENT = options.isRegistrationCurrent;
		this.IS_PROVIDER_CLEANUP_PENDING = options.isProviderCleanupPending;
		this.REGISTER_DISPOSER = options.registerDisposer;
		this.VALIDATE_CAPTIVE_DEPENDENCY = options.validateCaptiveDependency;
		this.WAIT_FOR_PROVIDER_CLEANUP = options.waitForProviderCleanup;
	}

	public async resolveAllAsyncInternal(dependencyKeySymbol: symbol, requestScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<Array<unknown>> {
		this.ENSURE_ACTIVE();
		this.throwIfCircularDependency(dependencyKeySymbol, path, visitedTokens);

		let lookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

		if (lookup.registration && this.IS_PROVIDER_CLEANUP_PENDING(lookup.owner, dependencyKeySymbol)) {
			await this.WAIT_FOR_PROVIDER_CLEANUP(lookup.owner, dependencyKeySymbol);
			lookup = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);
		}

		if (!lookup.registration) {
			throw this.createTokenNotFoundError(dependencyKeySymbol, lookup.lookupPath);
		}

		const registrations: ReadonlyArray<IProviderRegistration<unknown>> = lookup.registrations ?? [];
		const providerOwner: DIContainer = lookup.owner;
		const nextVisitedTokens: Set<symbol> = new Set<symbol>(visitedTokens);
		nextVisitedTokens.add(dependencyKeySymbol);
		const nextPath: Array<symbol> = [...path, dependencyKeySymbol];

		return await Promise.all(registrations.map(async (registration: IProviderRegistration<unknown>): Promise<unknown> => await this.resolveRegistrationAsync(registration, providerOwner, requestScope, dependencyKeySymbol, nextPath, nextVisitedTokens)));
	}

	public resolveAllSyncInternal(dependencyKeySymbol: symbol, requestScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Array<unknown> {
		this.ENSURE_ACTIVE();
		this.throwIfCircularDependency(dependencyKeySymbol, path, visitedTokens);

		const lookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

		if (lookup.registration && this.IS_PROVIDER_CLEANUP_PENDING(lookup.owner, dependencyKeySymbol)) {
			throw this.createProviderCleanupPendingError(dependencyKeySymbol, lookup.owner.id);
		}

		if (!lookup.registration) {
			throw this.createTokenNotFoundError(dependencyKeySymbol, lookup.lookupPath);
		}

		const registrations: ReadonlyArray<IProviderRegistration<unknown>> = lookup.registrations ?? [];
		const providerOwner: DIContainer = lookup.owner;
		const nextVisitedTokens: Set<symbol> = new Set<symbol>(visitedTokens);
		nextVisitedTokens.add(dependencyKeySymbol);
		const nextPath: Array<symbol> = [...path, dependencyKeySymbol];

		return registrations.map((registration: IProviderRegistration<unknown>) => this.resolveRegistrationSync(registration, providerOwner, requestScope, dependencyKeySymbol, nextPath, nextVisitedTokens));
	}

	public async resolveAsyncInternal(dependencyKeySymbol: symbol, requestScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<unknown> {
		this.ENSURE_ACTIVE();
		this.throwIfCircularDependency(dependencyKeySymbol, path, visitedTokens);

		let lookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

		if (lookup.registration && this.IS_PROVIDER_CLEANUP_PENDING(lookup.owner, dependencyKeySymbol)) {
			await this.WAIT_FOR_PROVIDER_CLEANUP(lookup.owner, dependencyKeySymbol);
			lookup = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);
		}

		return await this.resolveSingleRegistrationAsync(dependencyKeySymbol, lookup, path, requestScope, visitedTokens);
	}

	public resolveSyncInternal(dependencyKeySymbol: symbol, requestScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): unknown {
		this.ENSURE_ACTIVE();
		this.throwIfCircularDependency(dependencyKeySymbol, path, visitedTokens);

		const lookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

		if (lookup.registration && this.IS_PROVIDER_CLEANUP_PENDING(lookup.owner, dependencyKeySymbol)) {
			throw this.createProviderCleanupPendingError(dependencyKeySymbol, lookup.owner.id);
		}

		return this.resolveSingleRegistrationSync(dependencyKeySymbol, lookup, path, requestScope, visitedTokens);
	}

	private createAsyncProviderError(dependencyKeySymbol: symbol): BaseError {
		return new BaseError("Use resolveAsync() for async providers", {
			code: "ASYNC_PROVIDER_ERROR",
			context: {
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createAsyncProviderHookError(dependencyKeySymbol: symbol, hookName: "afterResolve" | "onInit"): BaseError {
		return new BaseError(`Provider ${hookName} hook requires resolveAsync()`, {
			code: "ASYNC_PROVIDER_HOOK_ERROR",
			context: {
				hook: hookName,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createLazyResolver(lazyDependencyKeySymbol: symbol, dependencyResolutionScope: DIContainer): () => Promise<unknown> {
		const scopeReference: WeakRef<DIContainer> = new WeakRef<DIContainer>(dependencyResolutionScope);
		const scopeId: string = dependencyResolutionScope.id;

		return async (): Promise<unknown> => {
			const resolutionScope: DIContainer | undefined = scopeReference.deref();

			if (!resolutionScope) {
				throw this.createLazyScopeDisposedError(lazyDependencyKeySymbol, scopeId);
			}

			try {
				return await this.resolveAsyncInternal(lazyDependencyKeySymbol, resolutionScope, [], new Set<symbol>());
			} catch (error) {
				const normalizedError: Error = toError(error);

				if (normalizedError instanceof BaseError && normalizedError.code === "SCOPE_DISPOSED") {
					throw this.createLazyScopeDisposedError(lazyDependencyKeySymbol, scopeId, normalizedError);
				}

				throw normalizedError;
			}
		};
	}

	private createLazyScopeDisposedError(dependencyKeySymbol: symbol, scopeId: string, cause?: Error): BaseError {
		return new BaseError("Lazy provider invoked after scope disposal", {
			cause,
			code: "LAZY_SCOPE_DISPOSED",
			context: {
				scopeId,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createProviderCleanupPendingError(dependencyKeySymbol: symbol, scopeId: string): BaseError {
		return new BaseError("Provider cleanup is in progress after overwrite", {
			code: "PROVIDER_CLEANUP_PENDING",
			context: {
				scopeId,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createProviderHookFailedError(dependencyKeySymbol: symbol, hookName: "afterResolve" | "onInit", error: unknown): BaseError {
		return new BaseError(`Provider ${hookName} hook failed`, {
			cause: toError(error),
			code: "PROVIDER_HOOK_FAILED",
			context: {
				hook: hookName,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createStaleRegistrationError(ownerScope: DIContainer, dependencyKeySymbol: symbol): BaseError {
		return new BaseError("Provider registration changed during multi-resolution", {
			code: "PROVIDER_STALE_REGISTRATION",
			context: {
				scopeId: ownerScope.id,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createTokenNotFoundError(dependencyKeySymbol: symbol, lookupPath: Array<string>): BaseError {
		return new BaseError("Token not found in container", {
			code: "TOKEN_NOT_FOUND",
			context: {
				lookupPath,
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private getDisposerScope(registration: IProviderRegistration<unknown>, providerOwner: DIContainer, requestScope: DIContainer): DIContainer {
		return registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwner : requestScope;
	}

	private async instantiateAsync(registration: IProviderRegistration<unknown>, dependencyResolutionScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<unknown> {
		if (registration.type === EProviderType.VALUE) {
			return (registration.provider as IValueProvider<unknown>).useValue;
		}

		if (registration.type === EProviderType.ALIAS) {
			const aliasProvider: IAliasProvider<unknown> = registration.provider as IAliasProvider<unknown>;
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, aliasProvider.useExisting, dependencyResolutionScope);

			return await this.resolveAsyncInternal(this.ASSERT_KEY(aliasProvider.useExisting), dependencyResolutionScope, path, visitedTokens);
		}

		if (registration.type === EProviderType.LAZY) {
			const lazyProvider: ILazyProvider<() => Promise<unknown>> = registration.provider as ILazyProvider<() => Promise<unknown>>;
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, lazyProvider.useLazy, dependencyResolutionScope);
			const lazyDependencyKeySymbol: symbol = this.ASSERT_KEY(lazyProvider.useLazy);

			return this.createLazyResolver(lazyDependencyKeySymbol, dependencyResolutionScope);
		}

		if (registration.type === EProviderType.CLASS) {
			const classProvider: IClassProvider<unknown> = registration.provider as IClassProvider<unknown>;
			const dependencies: ReadonlyArray<Token<unknown>> = classProvider.deps ?? [];

			for (const dependencyToken of dependencies) {
				this.VALIDATE_CAPTIVE_DEPENDENCY(registration, dependencyToken, dependencyResolutionScope);
			}

			const dependencyInstances: Array<unknown> = await Promise.all(dependencies.map(async (dependencyToken: Token<unknown>): Promise<unknown> => await this.resolveAsyncInternal(this.ASSERT_KEY(dependencyToken), dependencyResolutionScope, path, visitedTokens)));

			return new classProvider.useClass(...(dependencyInstances as Array<never>));
		}

		const factoryProvider: IFactoryProvider<unknown> = registration.provider as IFactoryProvider<unknown>;
		const dependencies: ReadonlyArray<Token<unknown>> = factoryProvider.deps ?? [];

		for (const dependencyToken of dependencies) {
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, dependencyToken, dependencyResolutionScope);
		}

		const dependencyInstances: Array<unknown> = await Promise.all(dependencies.map(async (dependencyToken: Token<unknown>): Promise<unknown> => await this.resolveAsyncInternal(this.ASSERT_KEY(dependencyToken), dependencyResolutionScope, path, visitedTokens)));

		return factoryProvider.useFactory(...(dependencyInstances as Array<never>));
	}

	private instantiateSync(registration: IProviderRegistration<unknown>, dependencyResolutionScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): unknown {
		if (registration.type === EProviderType.VALUE) {
			return (registration.provider as IValueProvider<unknown>).useValue;
		}

		if (registration.type === EProviderType.ALIAS) {
			const aliasProvider: IAliasProvider<unknown> = registration.provider as IAliasProvider<unknown>;
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, aliasProvider.useExisting, dependencyResolutionScope);

			return this.resolveSyncInternal(this.ASSERT_KEY(aliasProvider.useExisting), dependencyResolutionScope, path, visitedTokens);
		}

		if (registration.type === EProviderType.LAZY) {
			const lazyProvider: ILazyProvider<() => Promise<unknown>> = registration.provider as ILazyProvider<() => Promise<unknown>>;
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, lazyProvider.useLazy, dependencyResolutionScope);
			const lazyDependencyKeySymbol: symbol = this.ASSERT_KEY(lazyProvider.useLazy);

			return this.createLazyResolver(lazyDependencyKeySymbol, dependencyResolutionScope);
		}

		if (registration.type === EProviderType.CLASS) {
			const classProvider: IClassProvider<unknown> = registration.provider as IClassProvider<unknown>;
			const dependencies: ReadonlyArray<Token<unknown>> = classProvider.deps ?? [];

			for (const dependencyToken of dependencies) {
				this.VALIDATE_CAPTIVE_DEPENDENCY(registration, dependencyToken, dependencyResolutionScope);
			}

			const dependencyInstances: Array<unknown> = dependencies.map((dependencyToken: Token<unknown>) => this.resolveSyncInternal(this.ASSERT_KEY(dependencyToken), dependencyResolutionScope, path, visitedTokens));

			return new classProvider.useClass(...(dependencyInstances as Array<never>));
		}

		const factoryProvider: IFactoryProvider<unknown> = registration.provider as IFactoryProvider<unknown>;

		if (registration.isAsyncFactory) {
			throw this.createAsyncProviderError(this.ASSERT_KEY(factoryProvider.provide));
		}

		const dependencies: ReadonlyArray<Token<unknown>> = factoryProvider.deps ?? [];

		for (const dependencyToken of dependencies) {
			this.VALIDATE_CAPTIVE_DEPENDENCY(registration, dependencyToken, dependencyResolutionScope);
		}

		const dependencyInstances: Array<unknown> = dependencies.map((dependencyToken: Token<unknown>) => this.resolveSyncInternal(this.ASSERT_KEY(dependencyToken), dependencyResolutionScope, path, visitedTokens));
		const result: unknown = factoryProvider.useFactory(...(dependencyInstances as Array<never>));

		if (this.isPromiseLike(result)) {
			throw this.createAsyncProviderError(this.ASSERT_KEY(factoryProvider.provide));
		}

		return result;
	}

	private async invokeAfterResolveAsync(registration: IProviderRegistration<unknown>, dependencyKeySymbol: symbol, instance: unknown): Promise<unknown> {
		await this.runLifecycleHookAsync(registration.provider, "afterResolve", instance, dependencyKeySymbol);

		return instance;
	}

	private invokeAfterResolveSync(registration: IProviderRegistration<unknown>, dependencyKeySymbol: symbol, instance: unknown): unknown {
		this.runLifecycleHookSync(registration.provider, "afterResolve", instance, dependencyKeySymbol);

		return instance;
	}

	private async invokeOnInitAsync(registration: IProviderRegistration<unknown>, dependencyKeySymbol: symbol, instance: unknown): Promise<void> {
		await this.runLifecycleHookAsync(registration.provider, "onInit", instance, dependencyKeySymbol);
	}

	private invokeOnInitSync(registration: IProviderRegistration<unknown>, dependencyKeySymbol: symbol, instance: unknown): void {
		this.runLifecycleHookSync(registration.provider, "onInit", instance, dependencyKeySymbol);
	}

	private isPromiseLike(value: unknown): value is PromiseLike<unknown> {
		if (value === null || value === undefined) {
			return false;
		}

		const valueType: string = typeof value;

		if (valueType !== "function" && valueType !== "object") {
			return false;
		}

		return typeof (value as { then?: unknown }).then === "function";
	}

	private async resolveRegistrationAsync(registration: IProviderRegistration<unknown>, providerOwner: DIContainer, requestScope: DIContainer, dependencyKeySymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<unknown> {
		if (this.IS_PROVIDER_CLEANUP_PENDING(providerOwner, dependencyKeySymbol)) {
			await this.WAIT_FOR_PROVIDER_CLEANUP(providerOwner, dependencyKeySymbol);

			if (!this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration)) {
				throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
			}
		}

		const dependencyResolutionScope: DIContainer = registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwner : requestScope;

		const cache: Map<symbol, unknown> | undefined = this.GET_SCOPED_CACHE_FOR_LIFECYCLE(registration.lifecycle, requestScope, providerOwner);
		const cacheKey: symbol = registration.cacheKey;

		if (cache) {
			if (cache.has(cacheKey)) {
				const cachedValue: unknown = cache.get(cacheKey);
				const resolvedCachedValue: unknown = await Promise.resolve(cachedValue);
				const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

				if (!isCurrentRegistration) {
					throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
				}

				return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, resolvedCachedValue);
			}

			const creationPromise: Promise<unknown> = this.instantiateAsync(registration, dependencyResolutionScope, path, visitedTokens);
			cache.set(cacheKey, creationPromise);

			try {
				const createdValue: unknown = await creationPromise;
				const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

				if (!isCurrentRegistration) {
					if (cache.get(cacheKey) === creationPromise) {
						cache.delete(cacheKey);
					}

					await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

					throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
				}

				try {
					await this.invokeOnInitAsync(registration, dependencyKeySymbol, createdValue);
				} catch (error) {
					await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

					throw error;
				}

				cache.set(cacheKey, createdValue);
				const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
				this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

				return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, createdValue);
			} catch (error) {
				if (cache.get(cacheKey) === creationPromise) {
					cache.delete(cacheKey);
				}

				throw error;
			}
		}

		const createdValue: unknown = await this.instantiateAsync(registration, dependencyResolutionScope, path, visitedTokens);

		try {
			await this.invokeOnInitAsync(registration, dependencyKeySymbol, createdValue);
		} catch (error) {
			await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

			throw error;
		}
		const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
		this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

		return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, createdValue);
	}

	private resolveRegistrationSync(registration: IProviderRegistration<unknown>, providerOwner: DIContainer, requestScope: DIContainer, dependencyKeySymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): unknown {
		if (this.IS_PROVIDER_CLEANUP_PENDING(providerOwner, dependencyKeySymbol)) {
			throw this.createProviderCleanupPendingError(dependencyKeySymbol, providerOwner.id);
		}

		const dependencyResolutionScope: DIContainer = registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwner : requestScope;

		const cache: Map<symbol, unknown> | undefined = this.GET_SCOPED_CACHE_FOR_LIFECYCLE(registration.lifecycle, requestScope, providerOwner);
		const cacheKey: symbol = registration.cacheKey;

		if (cache?.has(cacheKey)) {
			const cachedValue: unknown = cache.get(cacheKey);

			if (this.isPromiseLike(cachedValue)) {
				throw this.createAsyncProviderError(dependencyKeySymbol);
			}

			const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

			if (!isCurrentRegistration) {
				throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
			}

			return this.invokeAfterResolveSync(registration, dependencyKeySymbol, cachedValue);
		}

		const createdValue: unknown = this.instantiateSync(registration, dependencyResolutionScope, path, visitedTokens);

		if (cache) {
			const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

			if (!isCurrentRegistration) {
				this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

				throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
			}

			try {
				this.invokeOnInitSync(registration, dependencyKeySymbol, createdValue);
			} catch (error) {
				this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

				throw error;
			}

			cache.set(cacheKey, createdValue);
			const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
			this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

			return this.invokeAfterResolveSync(registration, dependencyKeySymbol, createdValue);
		}

		try {
			this.invokeOnInitSync(registration, dependencyKeySymbol, createdValue);
		} catch (error) {
			this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

			throw error;
		}
		const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
		this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

		return this.invokeAfterResolveSync(registration, dependencyKeySymbol, createdValue);
	}

	private async resolveSingleRegistrationAsync(dependencyKeySymbol: symbol, lookup: IProviderLookup<DIContainer>, path: Array<symbol>, requestScope: DIContainer, visitedTokens: ReadonlySet<symbol>, staleRetryCount: number = 0): Promise<unknown> {
		const registration: IProviderRegistration<unknown> = this.ASSERT_SINGLE_BINDING_LOOKUP(dependencyKeySymbol, lookup);
		const nextVisitedTokens: Set<symbol> = new Set<symbol>(visitedTokens);
		nextVisitedTokens.add(dependencyKeySymbol);
		const nextPath: Array<symbol> = [...path, dependencyKeySymbol];
		const providerOwner: DIContainer = lookup.owner;

		if (this.IS_PROVIDER_CLEANUP_PENDING(providerOwner, dependencyKeySymbol)) {
			await this.WAIT_FOR_PROVIDER_CLEANUP(providerOwner, dependencyKeySymbol);

			if (staleRetryCount >= MAX_STALE_REGISTRATION_RETRIES) {
				throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
			}

			const retryLookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

			return await this.resolveSingleRegistrationAsync(dependencyKeySymbol, retryLookup, path, requestScope, visitedTokens, staleRetryCount + 1);
		}

		const dependencyResolutionScope: DIContainer = registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwner : requestScope;

		const cache: Map<symbol, unknown> | undefined = this.GET_SCOPED_CACHE_FOR_LIFECYCLE(registration.lifecycle, requestScope, providerOwner);
		const cacheKey: symbol = registration.cacheKey;

		if (cache) {
			if (cache.has(cacheKey)) {
				const cachedValue: unknown = cache.get(cacheKey);
				const resolvedCachedValue: unknown = await Promise.resolve(cachedValue);
				const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

				if (!isCurrentRegistration) {
					if (staleRetryCount >= MAX_STALE_REGISTRATION_RETRIES) {
						throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
					}

					const retryLookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

					return await this.resolveSingleRegistrationAsync(dependencyKeySymbol, retryLookup, path, requestScope, visitedTokens, staleRetryCount + 1);
				}

				return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, resolvedCachedValue);
			}

			const creationPromise: Promise<unknown> = this.instantiateAsync(registration, dependencyResolutionScope, nextPath, nextVisitedTokens);
			cache.set(cacheKey, creationPromise);

			try {
				const createdValue: unknown = await creationPromise;
				const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

				if (!isCurrentRegistration) {
					if (cache.get(cacheKey) === creationPromise) {
						cache.delete(cacheKey);
					}

					await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

					if (staleRetryCount >= MAX_STALE_REGISTRATION_RETRIES) {
						throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
					}

					const retryLookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

					return await this.resolveSingleRegistrationAsync(dependencyKeySymbol, retryLookup, path, requestScope, visitedTokens, staleRetryCount + 1);
				}

				try {
					await this.invokeOnInitAsync(registration, dependencyKeySymbol, createdValue);
				} catch (error) {
					await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

					throw error;
				}

				cache.set(cacheKey, createdValue);
				const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
				this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

				return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, createdValue);
			} catch (error) {
				if (cache.get(cacheKey) === creationPromise) {
					cache.delete(cacheKey);
				}

				throw error;
			}
		}

		const createdValue: unknown = await this.instantiateAsync(registration, dependencyResolutionScope, nextPath, nextVisitedTokens);

		try {
			await this.invokeOnInitAsync(registration, dependencyKeySymbol, createdValue);
		} catch (error) {
			await this.tryDisposeAfterOnInitFailureAsync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

			throw error;
		}
		const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
		this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

		return await this.invokeAfterResolveAsync(registration, dependencyKeySymbol, createdValue);
	}

	private resolveSingleRegistrationSync(dependencyKeySymbol: symbol, lookup: IProviderLookup<DIContainer>, path: Array<symbol>, requestScope: DIContainer, visitedTokens: ReadonlySet<symbol>, staleRetryCount: number = 0): unknown {
		const registration: IProviderRegistration<unknown> = this.ASSERT_SINGLE_BINDING_LOOKUP(dependencyKeySymbol, lookup);
		const nextVisitedTokens: Set<symbol> = new Set<symbol>(visitedTokens);
		nextVisitedTokens.add(dependencyKeySymbol);
		const nextPath: Array<symbol> = [...path, dependencyKeySymbol];
		const providerOwner: DIContainer = lookup.owner;

		if (this.IS_PROVIDER_CLEANUP_PENDING(providerOwner, dependencyKeySymbol)) {
			throw this.createProviderCleanupPendingError(dependencyKeySymbol, providerOwner.id);
		}

		const dependencyResolutionScope: DIContainer = registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwner : requestScope;

		const cache: Map<symbol, unknown> | undefined = this.GET_SCOPED_CACHE_FOR_LIFECYCLE(registration.lifecycle, requestScope, providerOwner);
		const cacheKey: symbol = registration.cacheKey;

		if (cache?.has(cacheKey)) {
			const cachedValue: unknown = cache.get(cacheKey);

			if (this.isPromiseLike(cachedValue)) {
				throw this.createAsyncProviderError(dependencyKeySymbol);
			}

			const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

			if (!isCurrentRegistration) {
				if (staleRetryCount >= MAX_STALE_REGISTRATION_RETRIES) {
					throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
				}

				const retryLookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

				return this.resolveSingleRegistrationSync(dependencyKeySymbol, retryLookup, path, requestScope, visitedTokens, staleRetryCount + 1);
			}

			return this.invokeAfterResolveSync(registration, dependencyKeySymbol, cachedValue);
		}

		const createdValue: unknown = this.instantiateSync(registration, dependencyResolutionScope, nextPath, nextVisitedTokens);

		if (cache) {
			const isCurrentRegistration: boolean = this.IS_REGISTRATION_CURRENT(providerOwner, dependencyKeySymbol, registration);

			if (!isCurrentRegistration) {
				this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

				if (staleRetryCount >= MAX_STALE_REGISTRATION_RETRIES) {
					throw this.createStaleRegistrationError(providerOwner, dependencyKeySymbol);
				}

				const retryLookup: IProviderLookup<DIContainer> = this.FIND_PROVIDER(requestScope, dependencyKeySymbol);

				return this.resolveSingleRegistrationSync(dependencyKeySymbol, retryLookup, path, requestScope, visitedTokens, staleRetryCount + 1);
			}

			try {
				this.invokeOnInitSync(registration, dependencyKeySymbol, createdValue);
			} catch (error) {
				this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

				throw error;
			}

			cache.set(cacheKey, createdValue);
			const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
			this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

			return this.invokeAfterResolveSync(registration, dependencyKeySymbol, createdValue);
		}

		try {
			this.invokeOnInitSync(registration, dependencyKeySymbol, createdValue);
		} catch (error) {
			this.tryDisposeAfterOnInitFailureSync(registration, providerOwner, requestScope, dependencyKeySymbol, createdValue);

			throw error;
		}
		const disposerScope: DIContainer = this.getDisposerScope(registration, providerOwner, requestScope);
		this.REGISTER_DISPOSER(disposerScope, registration.provider, createdValue, dependencyKeySymbol);

		return this.invokeAfterResolveSync(registration, dependencyKeySymbol, createdValue);
	}

	private async runLifecycleHookAsync(provider: Provider, hookName: "afterResolve" | "onInit", instance: unknown, dependencyKeySymbol: symbol): Promise<void> {
		const hook: ((instance: unknown) => Promise<void> | void) | undefined = (provider as IProviderBase<unknown>)[hookName];

		if (!hook) {
			return;
		}

		try {
			await hook(instance);
		} catch (error) {
			throw this.createProviderHookFailedError(dependencyKeySymbol, hookName, error);
		}
	}

	private runLifecycleHookSync(provider: Provider, hookName: "afterResolve" | "onInit", instance: unknown, dependencyKeySymbol: symbol): void {
		const hook: ((instance: unknown) => Promise<void> | void) | undefined = (provider as IProviderBase<unknown>)[hookName];

		if (!hook) {
			return;
		}

		try {
			const hookResult: Promise<void> | void = hook(instance);

			if (this.isPromiseLike(hookResult)) {
				throw this.createAsyncProviderHookError(dependencyKeySymbol, hookName);
			}
		} catch (error) {
			if (error instanceof BaseError && error.code === "ASYNC_PROVIDER_HOOK_ERROR") {
				throw error;
			}

			throw this.createProviderHookFailedError(dependencyKeySymbol, hookName, error);
		}
	}

	private throwIfCircularDependency(dependencyKeySymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): void {
		if (visitedTokens.has(dependencyKeySymbol)) {
			throw new BaseError("Circular dependency detected", {
				code: "CIRCULAR_DEPENDENCY",
				context: {
					chain: [...path, dependencyKeySymbol].map((token: symbol) => this.DESCRIBE_KEY(token)),
				},
				source: "DIContainer",
			});
		}
	}

	private async tryDisposeAfterOnInitFailureAsync(registration: IProviderRegistration<unknown>, providerOwner: DIContainer, requestScope: DIContainer, dependencyKeySymbol: symbol, instance: unknown): Promise<void> {
		const disposer: (() => Promise<void>) | undefined = this.REGISTER_DISPOSER(this.getDisposerScope(registration, providerOwner, requestScope), registration.provider, instance, dependencyKeySymbol, {
			shouldTrack: false,
		});

		if (!disposer) {
			return;
		}

		try {
			await disposer();
		} catch {
			// Preserve the original onInit error if rollback cleanup fails.
		}
	}

	private tryDisposeAfterOnInitFailureSync(registration: IProviderRegistration<unknown>, providerOwner: DIContainer, requestScope: DIContainer, dependencyKeySymbol: symbol, instance: unknown): void {
		const disposer: (() => Promise<void>) | undefined = this.REGISTER_DISPOSER(this.getDisposerScope(registration, providerOwner, requestScope), registration.provider, instance, dependencyKeySymbol, {
			shouldTrack: false,
		});

		if (!disposer) {
			return;
		}

		void disposer().catch(() => {
			// Preserve the original onInit error if rollback cleanup fails.
		});
	}
}
