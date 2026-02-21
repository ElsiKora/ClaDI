import type { IContainerSnapshot, IDependencyGraph, IDIScopeCreateOptions, ILogger, IResolutionExplanation, IResolveInterceptor } from "@domain/interface";
import type { IDIContainer, Provider, Token } from "@domain/type";
import type { IInternalContainerOptions } from "@infrastructure/class/di/interface/internal-container-options.interface";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle, EDiContainerCaptiveDependencyPolicy, EDiContainerDuplicateProviderPolicy } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";
import { CacheCoordinator } from "@infrastructure/class/di/cache/coordinator.class";
import { DisposalCoordinator } from "@infrastructure/class/di/disposal/coordinator.class";
import { DisposalManager } from "@infrastructure/class/di/disposal/manager.class";
import { DisposerCoordinator } from "@infrastructure/class/di/disposer/coordinator.class";
import { ResolutionEngine } from "@infrastructure/class/di/engine/resolution.class";
import { DependencyGraphCoordinator } from "@infrastructure/class/di/graph/coordinator.class";
import { ResolveInterceptorDispatcher } from "@infrastructure/class/di/interceptor/dispatcher.class";
import { LookupCoordinator } from "@infrastructure/class/di/lookup/coordinator.class";
import { RegistrationCoordinator } from "@infrastructure/class/di/registration/coordinator.class";
import { ResolutionCoordinator } from "@infrastructure/class/di/resolution/coordinator.class";
import { ConsoleLoggerService } from "@infrastructure/service";
import { toError } from "@infrastructure/utility/to-error.utility";

/**
 * Advanced DI container with scoped and async resolution support.
 */
export class DIContainer implements IDIContainer {
	public id: string;

	public get isLocked(): boolean {
		return this.isScopeLocked;
	}

	private readonly ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS?: number;

	private readonly CACHE_COORDINATOR: CacheCoordinator;

	private readonly CAPTIVE_DEPENDENCY_POLICY: EDiContainerCaptiveDependencyPolicy;

	private readonly CHILD_SCOPES: Set<DIContainer>;

	private readonly DEPENDENCY_GRAPH_COORDINATOR: DependencyGraphCoordinator;

	private readonly DISPOSAL_COORDINATOR: DisposalCoordinator<DIContainer>;

	private readonly DISPOSAL_MANAGER: DisposalManager;

	private disposePromise?: Promise<void>;

	private readonly DISPOSER_COORDINATOR: DisposerCoordinator;

	private readonly DISPOSERS: Array<() => Promise<void>>;

	private readonly DISPOSERS_BY_TOKEN: Map<symbol, Array<() => Promise<void>>>;

	private readonly DUPLICATE_PROVIDER_POLICY: EDiContainerDuplicateProviderPolicy;

	private isDisposed: boolean;

	private isDisposing: boolean;

	private isScopeLocked: boolean;

	private readonly LOGGER: ILogger;

	private readonly LOOKUP_COORDINATOR: LookupCoordinator;

	private readonly PARENT?: DIContainer;

	private readonly PENDING_PROVIDER_CLEANUPS: Map<
		symbol,
		{
			isSettled: boolean;
			promise: Promise<void>;
		}
	>;

	private readonly PROVIDERS: Map<symbol, Array<IProviderRegistration<unknown>>>;

	private readonly REGISTRATION_COORDINATOR: RegistrationCoordinator;

	private readonly RESOLUTION_COORDINATOR: ResolutionCoordinator;

	private readonly RESOLUTION_ENGINE: ResolutionEngine;

	private readonly RESOLVE_INTERCEPTOR_DISPATCHER: ResolveInterceptorDispatcher;

	private readonly RESOLVE_INTERCEPTORS: ReadonlyArray<IResolveInterceptor>;

	private readonly ROOT: DIContainer;

	private readonly ROOT_SCOPE_COUNTER: { value: number };

	private readonly ROOT_SINGLETON_CACHE: Map<DIContainer, Map<symbol, unknown>>;

	private readonly SCOPED_CACHE: Map<symbol, unknown>;

	constructor(options: IInternalContainerOptions = {}) {
		this.PARENT = options.parent;
		this.ROOT = options.root ?? this;
		this.ROOT_SCOPE_COUNTER = this.ROOT === this ? { value: 0 } : this.ROOT.ROOT_SCOPE_COUNTER;
		const normalizedScopeName: string | undefined = options.scopeName?.trim();
		this.id = normalizedScopeName && normalizedScopeName.length > 0 ? normalizedScopeName : `scope-${String(++this.ROOT_SCOPE_COUNTER.value)}`;

		this.LOGGER = options.logger ?? options.parent?.LOGGER ?? new ConsoleLoggerService();
		this.ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS = options.asyncResolutionDrainTimeoutMs ?? options.parent?.ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS;
		this.CAPTIVE_DEPENDENCY_POLICY = options.captiveDependencyPolicy ?? options.parent?.CAPTIVE_DEPENDENCY_POLICY ?? EDiContainerCaptiveDependencyPolicy.WARN;
		this.DUPLICATE_PROVIDER_POLICY = options.duplicateProviderPolicy ?? options.parent?.DUPLICATE_PROVIDER_POLICY ?? EDiContainerDuplicateProviderPolicy.OVERWRITE;
		this.PROVIDERS = new Map<symbol, Array<IProviderRegistration<unknown>>>();
		this.ROOT_SINGLETON_CACHE = this.ROOT === this ? new Map<DIContainer, Map<symbol, unknown>>() : this.ROOT.ROOT_SINGLETON_CACHE;
		this.SCOPED_CACHE = new Map<symbol, unknown>();
		this.CACHE_COORDINATOR = this.ROOT === this ? new CacheCoordinator() : this.ROOT.CACHE_COORDINATOR;
		this.LOOKUP_COORDINATOR = this.ROOT === this ? new LookupCoordinator() : this.ROOT.LOOKUP_COORDINATOR;
		this.DEPENDENCY_GRAPH_COORDINATOR = new DependencyGraphCoordinator({
			assertKey: <T>(dependencyKey: Token<T>): symbol => this.assertToken(dependencyKey),
			captiveDependencyPolicy: this.CAPTIVE_DEPENDENCY_POLICY,
			describeKey: (dependencyKeySymbol: symbol): string => this.describeToken(dependencyKeySymbol),
			getChildScopes: (scopeNode: DIContainer): ReadonlyArray<DIContainer> => [...scopeNode.CHILD_SCOPES],
			getCurrentScopeId: (): string => this.id,
			getParent: (scopeNode: DIContainer): DIContainer | undefined => scopeNode.PARENT,
			getRegistrationsByToken: (scopeNode: DIContainer): ReadonlyMap<symbol, ReadonlyArray<IProviderRegistration<unknown>>> => scopeNode.PROVIDERS,
			getRegistrationsForScope: (scopeNode: DIContainer, dependencyKeySymbol: symbol): Array<IProviderRegistration<unknown>> | undefined => scopeNode.PROVIDERS.get(dependencyKeySymbol),
			getScopeId: (scopeNode: DIContainer): string => scopeNode.id,
			logger: this.LOGGER,
			lookupCoordinator: this.LOOKUP_COORDINATOR,
		});
		this.DISPOSER_COORDINATOR = new DisposerCoordinator({
			logger: this.LOGGER,
			stringifyKey: (dependencyKeySymbol: symbol): string => this.describeToken(dependencyKeySymbol),
			toError,
		});
		this.CHILD_SCOPES = new Set<DIContainer>();
		this.DISPOSERS = [];
		this.DISPOSERS_BY_TOKEN = new Map<symbol, Array<() => Promise<void>>>();
		this.PENDING_PROVIDER_CLEANUPS = new Map<
			symbol,
			{
				isSettled: boolean;
				promise: Promise<void>;
			}
		>();
		this.RESOLVE_INTERCEPTORS = options.resolveInterceptors ? Object.freeze([...options.resolveInterceptors]) : (options.parent?.RESOLVE_INTERCEPTORS ?? Object.freeze([]));
		this.RESOLVE_INTERCEPTOR_DISPATCHER = new ResolveInterceptorDispatcher({
			logger: this.LOGGER,
			resolveInterceptors: this.RESOLVE_INTERCEPTORS,
			stringifyKey: (dependencyKeySymbol: symbol): string => this.describeToken(dependencyKeySymbol),
			toError,
		});
		this.disposePromise = undefined;
		this.isDisposed = false;
		this.isDisposing = false;
		this.isScopeLocked = false;
		this.DISPOSAL_MANAGER = new DisposalManager({
			disposeInternal: async (): Promise<void> => {
				await this.disposeInternal();
			},
			getAsyncResolutionDrainTimeoutMs: (): number | undefined => this.ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS,
			getDisposePromise: (): Promise<void> | undefined => this.disposePromise,
			isDisposed: (): boolean => this.isDisposed,
			isDisposing: (): boolean => this.isDisposing,
			setDisposePromise: (disposePromise?: Promise<void>): void => {
				this.disposePromise = disposePromise;
			},
			setIsDisposing: (isDisposing: boolean): void => {
				this.isDisposing = isDisposing;
			},
		});
		this.DISPOSAL_COORDINATOR = new DisposalCoordinator<DIContainer>({
			clearChildScopes: (): void => {
				this.CHILD_SCOPES.clear();
			},
			clearDisposers: (): void => {
				this.DISPOSERS.length = 0;
			},
			clearDisposersByToken: (): void => {
				this.DISPOSERS_BY_TOKEN.clear();
			},
			clearProviders: (): void => {
				this.PROVIDERS.clear();
			},
			clearRootSingletonCacheIfRootScope: (): void => {
				if (this === this.ROOT) {
					this.ROOT_SINGLETON_CACHE.clear();
				}
			},
			clearScopedCache: (): void => {
				this.SCOPED_CACHE.clear();
			},
			detachFromParent: (): void => {
				this.PARENT?.CHILD_SCOPES.delete(this);
			},
			getChildScopesInReverse: (): ReadonlyArray<DIContainer> => [...this.CHILD_SCOPES.values()].reverse(),
			getDisposersInReverse: (): ReadonlyArray<() => Promise<void>> => [...this.DISPOSERS].reverse(),
			getScopeId: (): string => this.id,
			releaseSingletonCacheForScopeProviders: (): void => {
				this.CACHE_COORDINATOR.removeSingletonCacheForOwnerRegistrations(this.ROOT_SINGLETON_CACHE, this, this.PROVIDERS);
			},
			toError,
			waitForInFlightAsyncResolutions: async (): Promise<void> => {
				await this.DISPOSAL_MANAGER.waitForInFlightAsyncResolutions();
			},
		});
		this.REGISTRATION_COORDINATOR = new RegistrationCoordinator({
			assertKey: <T>(dependencyKey: Token<T>): symbol => this.assertToken(dependencyKey),
			describeKey: (dependencyKeySymbol: symbol): string => this.describeToken(dependencyKeySymbol),
			duplicateProviderPolicy: this.DUPLICATE_PROVIDER_POLICY,
			getProviderRegistrationCount: (): number => this.getProviderRegistrationCount(),
			getRegistrationsForProviderKey: (providerKey: symbol): Array<IProviderRegistration<unknown>> => this.PROVIDERS.get(providerKey) ?? [],
			getScopeId: (): string => this.id,
			logger: this.LOGGER,
			onAfterSingleBindingRegistered: (providerKey: symbol, existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>, registration: IProviderRegistration<unknown>): void => {
				const cacheKeysToInvalidate: Array<symbol> = existingRegistrations.length > 0 ? this.collectCacheKeys(existingRegistrations) : [registration.cacheKey];
				this.CACHE_COORDINATOR.removeSingletonCacheForOwnerCacheKeys(this.ROOT_SINGLETON_CACHE, this, cacheKeysToInvalidate);
				this.CACHE_COORDINATOR.clearScopedCachesRecursivelyForCacheKeys(
					cacheKeysToInvalidate,
					providerKey,
					this,
					(scopeNode: DIContainer): ReadonlyArray<DIContainer> => [...scopeNode.CHILD_SCOPES],
					(scopeNode: DIContainer): Map<symbol, unknown> => scopeNode.SCOPED_CACHE,
					(scopeNode: DIContainer, dependencyKey: symbol): boolean => scopeNode.PROVIDERS.has(dependencyKey),
				);
			},
			onBeforeOverwrite: (providerKey: symbol, existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>): void => {
				if (!this.hasTrackedDisposersForTokenRecursively(this, providerKey)) {
					return;
				}

				const cleanupPromise: Promise<void> = this.DISPOSER_COORDINATOR.disposeCachedInstancesForTokenRecursivelyAsync(providerKey, this, {
					deleteProviderDisposersByToken: (scopeNode: DIContainer, dependencyKeySymbol: symbol): void => {
						scopeNode.DISPOSERS_BY_TOKEN.delete(dependencyKeySymbol);
					},
					getChildScopes: (scopeNode: DIContainer): ReadonlyArray<DIContainer> => [...scopeNode.CHILD_SCOPES],
					getProviderDisposersByToken: (scopeNode: DIContainer, dependencyKeySymbol: symbol): Array<() => Promise<void>> | undefined => scopeNode.DISPOSERS_BY_TOKEN.get(dependencyKeySymbol),
					hasLocalProvider: (scopeNode: DIContainer, dependencyKeySymbol: symbol): boolean => scopeNode.PROVIDERS.has(dependencyKeySymbol),
					removeTrackedDisposer: (scopeNode: DIContainer, disposer: () => Promise<void>): void => {
						const disposerIndex: number = scopeNode.DISPOSERS.indexOf(disposer);

						if (disposerIndex !== -1) {
							scopeNode.DISPOSERS.splice(disposerIndex, 1);
						}
					},
				});

				if (!this.hasAsyncCleanupHooks(existingRegistrations)) {
					void cleanupPromise.catch((error: unknown) => {
						this.logProviderCleanupFailure(providerKey, error);
					});

					return;
				}

				this.queueProviderCleanup(providerKey, cleanupPromise);
			},
			setRegistrationsForProviderKey: (providerKey: symbol, registrations: Array<IProviderRegistration<unknown>>): void => {
				this.PROVIDERS.set(providerKey, registrations);
			},
		});
		this.RESOLUTION_COORDINATOR = new ResolutionCoordinator({
			assertKey: <T>(dependencyKey: Token<T>): symbol => this.assertToken(dependencyKey),
			assertSingleBindingLookup: (tokenSymbol: symbol, lookup: IProviderLookup<DIContainer>): IProviderRegistration<unknown> => this.DEPENDENCY_GRAPH_COORDINATOR.assertSingleBindingLookup(tokenSymbol, lookup),
			describeKey: (dependencyKeySymbol: symbol): string => this.describeToken(dependencyKeySymbol),
			ensureActive: (): void => {
				this.ensureActive();
			},
			findProvider: (requestScope: DIContainer, dependencyKeySymbol: symbol): IProviderLookup<DIContainer> => this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(requestScope, dependencyKeySymbol),
			getScopedCacheForLifecycle: (lifecycle: EDependencyLifecycle, requestScope: DIContainer, providerOwner: DIContainer): Map<symbol, unknown> | undefined => this.CACHE_COORDINATOR.getScopedCacheForLifecycle(lifecycle, requestScope.SCOPED_CACHE, this.ROOT_SINGLETON_CACHE, providerOwner),
			isProviderCleanupPending: (ownerScope: DIContainer, dependencyKeySymbol: symbol): boolean => ownerScope.isProviderCleanupPending(dependencyKeySymbol),
			isRegistrationCurrent: (ownerScope: DIContainer, dependencyKeySymbol: symbol, registration: IProviderRegistration<unknown>): boolean => this.isRegistrationCurrent(ownerScope, dependencyKeySymbol, registration),
			registerDisposer: (
				disposerScope: DIContainer,
				provider: Provider,
				instance: unknown,
				dependencyKeySymbol: symbol,
				registrationOptions?: {
					shouldTrack?: boolean;
				},
			): (() => Promise<void>) | undefined =>
				this.DISPOSER_COORDINATOR.registerDisposer(
					disposerScope,
					provider,
					instance,
					dependencyKeySymbol,
					{
						getProviderDisposersByToken: (scopeNode: DIContainer, tokenSymbol: symbol): Array<() => Promise<void>> | undefined => scopeNode.DISPOSERS_BY_TOKEN.get(tokenSymbol),
						pushDisposer: (scopeNode: DIContainer, disposer: () => Promise<void>): void => {
							scopeNode.DISPOSERS.push(disposer);
						},
						setProviderDisposersByToken: (scopeNode: DIContainer, tokenSymbol: symbol, providerDisposers: Array<() => Promise<void>>): void => {
							scopeNode.DISPOSERS_BY_TOKEN.set(tokenSymbol, providerDisposers);
						},
					},
					registrationOptions,
				),
			validateCaptiveDependency: (parentRegistration: IProviderRegistration<unknown>, dependencyToken: Token<unknown>, resolutionScope: DIContainer): void => {
				this.DEPENDENCY_GRAPH_COORDINATOR.validateCaptiveDependency(parentRegistration, dependencyToken, resolutionScope);
			},
			waitForProviderCleanup: async (ownerScope: DIContainer, dependencyKeySymbol: symbol): Promise<void> => {
				await ownerScope.waitForProviderCleanup(dependencyKeySymbol);
			},
		});
		this.RESOLUTION_ENGINE = new ResolutionEngine({
			assertKey: <T>(dependencyKey: Token<T>): symbol => this.assertToken(dependencyKey),
			ensureActive: (): void => {
				this.ensureActive();
			},
			ensureNotDisposing: (): void => {
				this.ensureNotDisposing();
			},
			getScopeId: (): string => this.id,
			notifyOnError: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, error: Error): void => {
				this.RESOLVE_INTERCEPTOR_DISPATCHER.notifyOnError(tokenSymbol, isAsync, isResolveAll, isOptional, scopeId, error);
			},
			notifyOnStart: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string): void => {
				this.RESOLVE_INTERCEPTOR_DISPATCHER.notifyOnStart(tokenSymbol, isAsync, isResolveAll, isOptional, scopeId);
			},
			notifyOnSuccess: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, result?: unknown): void => {
				this.RESOLVE_INTERCEPTOR_DISPATCHER.notifyOnSuccess(tokenSymbol, isAsync, isResolveAll, isOptional, scopeId, result);
			},
			onAsyncResolutionEnd: (): void => {
				this.DISPOSAL_MANAGER.onAsyncResolutionEnd();
			},
			onAsyncResolutionStart: (): void => {
				this.DISPOSAL_MANAGER.onAsyncResolutionStart();
			},
			resolveAllAsyncInternal: async (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<Array<unknown>> => await this.RESOLUTION_COORDINATOR.resolveAllAsyncInternal(tokenSymbol, this, path, visitedTokens),
			resolveAllSyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Array<unknown> => this.RESOLUTION_COORDINATOR.resolveAllSyncInternal(tokenSymbol, this, path, visitedTokens),
			resolveAsyncInternal: async (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): Promise<unknown> => await this.RESOLUTION_COORDINATOR.resolveAsyncInternal(tokenSymbol, this, path, visitedTokens),
			resolveSyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): unknown => this.RESOLUTION_COORDINATOR.resolveSyncInternal(tokenSymbol, this, path, visitedTokens),
		});

		if (this.PARENT) {
			this.PARENT.CHILD_SCOPES.add(this);
		}
	}

	public async bootstrap(tokens?: ReadonlyArray<Token<unknown>>): Promise<void> {
		this.ensureNotDisposing();
		this.ensureActive();
		const bootstrapTokens: ReadonlyArray<Token<unknown>> = tokens ?? this.getSingletonProviderTokens();

		for (const bootstrapDependency of bootstrapTokens) {
			const key: symbol = this.assertToken(bootstrapDependency);
			const lookup: IProviderLookup<DIContainer> = this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(this, key);
			const registrations: ReadonlyArray<IProviderRegistration<unknown>> = lookup.registrations ?? (lookup.registration ? [lookup.registration] : []);

			if (registrations.length === 0) {
				throw new BaseError("Token not found in container", {
					code: "TOKEN_NOT_FOUND",
					context: {
						lookupPath: lookup.lookupPath,
						token: this.describeToken(key),
					},
					source: "DIContainer",
				});
			}

			const hasMultiBindingRegistration: boolean = registrations.some((registration: IProviderRegistration<unknown>) => registration.isMultiBinding);

			if (hasMultiBindingRegistration) {
				await this.resolveAllAsync(bootstrapDependency);
				continue;
			}

			await this.resolveAsync(bootstrapDependency);
		}
	}

	public createScope(name?: string, options?: IDIScopeCreateOptions): DIContainer {
		this.ensureNotDisposing();
		this.ensureActive();

		return new DIContainer({
			asyncResolutionDrainTimeoutMs: options?.asyncResolutionDrainTimeoutMs,
			captiveDependencyPolicy: options?.captiveDependencyPolicy,
			duplicateProviderPolicy: options?.duplicateProviderPolicy,
			logger: this.LOGGER,
			parent: this,
			resolveInterceptors: options?.resolveInterceptors,
			root: this.ROOT,
			scopeName: name,
		});
	}

	public async dispose(): Promise<void> {
		await this.DISPOSAL_MANAGER.dispose();
	}

	public explain<T>(token: Token<T>): IResolutionExplanation {
		this.ensureNotDisposing();
		this.ensureActive();
		const key: symbol = this.assertToken(token);
		const lookup: IProviderLookup<DIContainer> = this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(this, key);
		const registration: IProviderRegistration<unknown> | undefined = lookup.registration;

		if (!registration) {
			return {
				dependencies: [],
				hasRootSingletonCache: this.CACHE_COORDINATOR.hasSingletonCacheForAnyOwner(this.ROOT_SINGLETON_CACHE, key, (ownerScope: DIContainer, dependencyKey: symbol): ReadonlyArray<IProviderRegistration<unknown>> | undefined => ownerScope.PROVIDERS.get(dependencyKey)),
				hasScopeCache: this.CACHE_COORDINATOR.hasScopedCacheForLookup(lookup, this.SCOPED_CACHE, key),
				isFound: false,
				lookupPath: lookup.lookupPath,
				scopeId: this.id,
				token: this.describeToken(key),
			};
		}

		return {
			dependencies: this.DEPENDENCY_GRAPH_COORDINATOR.getDependencyTokens(registration).map((dependencyToken: Token<unknown>) => this.describeToken(this.assertToken(dependencyToken))),
			hasRootSingletonCache: this.CACHE_COORDINATOR.hasSingletonCacheForOwner(this.ROOT_SINGLETON_CACHE, lookup.owner, lookup.registrations),
			hasScopeCache: this.CACHE_COORDINATOR.hasScopedCacheForLookup(lookup, this.SCOPED_CACHE, key),
			isAsyncFactory: registration.isAsyncFactory,
			isFound: true,
			lifecycle: registration.lifecycle,
			lookupPath: lookup.lookupPath,
			providerType: registration.type,
			scopeId: lookup.owner.id,
			token: this.describeToken(key),
		};
	}

	public exportGraph(): IDependencyGraph {
		this.ensureNotDisposing();
		this.ensureActive();
		const graphNodes: Array<IDependencyGraph["nodes"][number]> = [];
		const graphEdges: Array<IDependencyGraph["edges"][number]> = [];

		for (const [dependencyKeySymbol, registrations] of this.PROVIDERS.entries()) {
			const keyDescription: string = this.describeToken(dependencyKeySymbol);

			for (const registration of registrations) {
				graphNodes.push({
					isMultiBinding: registration.isMultiBinding,
					lifecycle: registration.lifecycle,
					providerType: registration.type,
					scopeId: this.id,
					token: keyDescription,
				});

				const dependencyTokens: ReadonlyArray<Token<unknown>> = this.DEPENDENCY_GRAPH_COORDINATOR.getDependencyTokens(registration);

				for (const dependencyToken of dependencyTokens) {
					graphEdges.push({
						from: keyDescription,
						scopeId: this.id,
						to: this.describeToken(this.assertToken(dependencyToken)),
					});
				}
			}
		}

		return {
			edges: graphEdges,
			nodes: graphNodes,
			scopeId: this.id,
		};
	}

	public getRegisteredTokens(): Array<Token<unknown>> {
		this.ensureNotDisposing();
		this.ensureActive();

		return [...this.PROVIDERS.keys()] as Array<Token<unknown>>;
	}

	public has(token: Token<unknown>): boolean {
		this.ensureNotDisposing();
		this.ensureActive();
		const key: symbol = this.assertToken(token);
		const lookup: IProviderLookup<DIContainer> = this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(this, key);

		return lookup.registration !== undefined;
	}

	public lock(): void {
		this.ensureNotDisposing();
		this.ensureActive();
		this.isScopeLocked = true;
	}

	public register(providerOrProviders: Array<Provider> | Provider): void {
		this.ensureNotDisposing();
		this.ensureActive();
		this.ensureNotLocked();

		const providers: Array<Provider> = Array.isArray(providerOrProviders) ? providerOrProviders : [providerOrProviders];

		for (const provider of providers) {
			this.REGISTRATION_COORDINATOR.registerProvider(provider);
		}
	}

	public resolve<T>(token: Token<T>): T {
		return this.RESOLUTION_ENGINE.resolve(token);
	}

	public resolveAll<T>(token: Token<T>): Array<T> {
		return this.RESOLUTION_ENGINE.resolveAll(token);
	}

	public async resolveAllAsync<T>(token: Token<T>): Promise<Array<T>> {
		return await this.RESOLUTION_ENGINE.resolveAllAsync(token);
	}

	public async resolveAsync<T>(token: Token<T>): Promise<T> {
		return await this.RESOLUTION_ENGINE.resolveAsync(token);
	}

	public resolveOptional<T>(token: Token<T>): T | undefined {
		return this.RESOLUTION_ENGINE.resolveOptional(token, (tokenSymbol: symbol) => this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(this, tokenSymbol).registration !== undefined);
	}

	public async resolveOptionalAsync<T>(token: Token<T>): Promise<T | undefined> {
		return await this.RESOLUTION_ENGINE.resolveOptionalAsync(token, (tokenSymbol: symbol) => this.DEPENDENCY_GRAPH_COORDINATOR.findProvider(this, tokenSymbol).registration !== undefined);
	}

	public snapshot(): IContainerSnapshot {
		this.ensureNotDisposing();
		this.ensureActive();

		const dependencyRegistrations: IContainerSnapshot["tokenRegistrations"] = [...this.PROVIDERS.entries()].map(([dependencyKeySymbol, registrations]: [symbol, Array<IProviderRegistration<unknown>>]) => ({
			hasMultiBinding: registrations.some((registration: IProviderRegistration<unknown>) => registration.isMultiBinding),
			registrationCount: registrations.length,
			token: this.describeToken(dependencyKeySymbol),
		}));

		return {
			childScopeCount: this.CHILD_SCOPES.size,
			isDisposed: this.isDisposed,
			isLocked: this.isScopeLocked,
			parentScopeId: this.PARENT?.id,
			providerCount: this.getProviderRegistrationCount(),
			rootScopeId: this.ROOT.id,
			scopedCacheSize: this.SCOPED_CACHE.size,
			scopeId: this.id,
			singletonCacheSize: this.CACHE_COORDINATOR.getRootSingletonCacheSize(this.ROOT_SINGLETON_CACHE),
			tokenRegistrations: dependencyRegistrations,
			tokens: this.getRegisteredTokens().map((token: Token<unknown>) => this.describeToken(this.assertToken(token))),
		};
	}

	public async unregister<T>(token: Token<T>): Promise<boolean> {
		this.ensureNotDisposing();
		this.ensureActive();
		this.ensureNotLocked();
		const key: symbol = this.assertToken(token);
		const existingRegistrations: Array<IProviderRegistration<unknown>> | undefined = this.PROVIDERS.get(key);

		if (!existingRegistrations || existingRegistrations.length === 0) {
			return false;
		}

		this.PROVIDERS.delete(key);
		const cacheKeysToInvalidate: Array<symbol> = this.collectCacheKeys(existingRegistrations);
		this.CACHE_COORDINATOR.removeSingletonCacheForOwnerCacheKeys(this.ROOT_SINGLETON_CACHE, this, cacheKeysToInvalidate);
		this.CACHE_COORDINATOR.clearScopedCachesRecursivelyForCacheKeys(
			cacheKeysToInvalidate,
			key,
			this,
			(scopeNode: DIContainer): ReadonlyArray<DIContainer> => [...scopeNode.CHILD_SCOPES],
			(scopeNode: DIContainer): Map<symbol, unknown> => scopeNode.SCOPED_CACHE,
			(scopeNode: DIContainer, dependencyKey: symbol): boolean => scopeNode.PROVIDERS.has(dependencyKey),
		);

		try {
			await this.DISPOSER_COORDINATOR.disposeCachedInstancesForTokenRecursivelyAsync(key, this, {
				deleteProviderDisposersByToken: (scopeNode: DIContainer, dependencyKeySymbol: symbol): void => {
					scopeNode.DISPOSERS_BY_TOKEN.delete(dependencyKeySymbol);
				},
				getChildScopes: (scopeNode: DIContainer): ReadonlyArray<DIContainer> => [...scopeNode.CHILD_SCOPES],
				getProviderDisposersByToken: (scopeNode: DIContainer, dependencyKeySymbol: symbol): Array<() => Promise<void>> | undefined => scopeNode.DISPOSERS_BY_TOKEN.get(dependencyKeySymbol),
				hasLocalProvider: (scopeNode: DIContainer, dependencyKeySymbol: symbol): boolean => scopeNode.PROVIDERS.has(dependencyKeySymbol),
				removeTrackedDisposer: (scopeNode: DIContainer, disposer: () => Promise<void>): void => {
					const disposerIndex: number = scopeNode.DISPOSERS.indexOf(disposer);

					if (disposerIndex !== -1) {
						scopeNode.DISPOSERS.splice(disposerIndex, 1);
					}
				},
			});
		} catch (error) {
			throw new BaseError("Provider was unregistered with cleanup errors", {
				cause: toError(error),
				code: "PROVIDER_UNREGISTER_CLEANUP_FAILED",
				context: {
					scopeId: this.id,
					token: this.describeToken(key),
				},
				source: "DIContainer",
			});
		}

		return true;
	}

	public validate(): void {
		this.ensureNotDisposing();
		this.ensureActive();
		this.DEPENDENCY_GRAPH_COORDINATOR.validateScopeTree(this);
	}

	private assertToken<T>(token: Token<T>): symbol {
		if (typeof token !== "symbol") {
			throw new BaseError("Token must be a symbol", {
				code: "TOKEN_NOT_SYMBOL",
				source: "DIContainer",
			});
		}

		return token;
	}

	private collectCacheKeys(registrations: ReadonlyArray<IProviderRegistration<unknown>>): Array<symbol> {
		return registrations.map((registration: IProviderRegistration<unknown>) => registration.cacheKey);
	}

	private describeToken(tokenSymbol: symbol): string {
		return tokenSymbol.description ? `Symbol(${tokenSymbol.description})` : tokenSymbol.toString();
	}

	private async disposeInternal(): Promise<void> {
		let shouldMarkScopeDisposed: boolean = true;

		try {
			await this.DISPOSAL_COORDINATOR.disposeInternal();
		} catch (error) {
			const normalizedError: Error = toError(error);

			if (normalizedError instanceof BaseError && normalizedError.code === "SCOPE_DISPOSE_ASYNC_DRAIN_TIMEOUT") {
				shouldMarkScopeDisposed = false;
			}

			throw error;
		} finally {
			if (shouldMarkScopeDisposed) {
				this.isDisposed = true;
				this.PENDING_PROVIDER_CLEANUPS.clear();
			}

			this.isDisposing = false;
			this.disposePromise = undefined;
		}
	}

	private ensureActive(): void {
		if (this.isDisposed) {
			throw new BaseError("Scope is already disposed", {
				code: "SCOPE_DISPOSED",
				context: { scopeId: this.id },
				source: "DIContainer",
			});
		}
	}

	private ensureNotDisposing(): void {
		if (this.isDisposing) {
			throw new BaseError("Scope is disposing", {
				code: "SCOPE_DISPOSING",
				context: { scopeId: this.id },
				source: "DIContainer",
			});
		}
	}

	private ensureNotLocked(): void {
		if (this.isScopeLocked) {
			throw new BaseError("Scope is locked for registrations", {
				code: "SCOPE_LOCKED",
				context: { scopeId: this.id },
				source: "DIContainer",
			});
		}
	}

	private getProviderRegistrationCount(): number {
		let totalRegistrations: number = 0;

		for (const registrations of this.PROVIDERS.values()) {
			totalRegistrations += registrations.length;
		}

		return totalRegistrations;
	}

	private getSingletonProviderTokens(): Array<Token<unknown>> {
		const singletonTokens: Array<Token<unknown>> = [];

		for (const [tokenSymbol, registrations] of this.PROVIDERS.entries()) {
			const hasSingletonRegistration: boolean = registrations.some((registration: IProviderRegistration<unknown>) => registration.lifecycle === EDependencyLifecycle.SINGLETON);

			if (hasSingletonRegistration) {
				singletonTokens.push(tokenSymbol as Token<unknown>);
			}
		}

		return singletonTokens;
	}

	private hasAsyncCleanupHooks(existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>): boolean {
		return existingRegistrations.some((registration: IProviderRegistration<unknown>) => {
			const onDisposeHook: ((instance: unknown) => Promise<void> | void) | undefined = registration.provider.onDispose as unknown as ((instance: unknown) => Promise<void> | void) | undefined;

			if (!onDisposeHook) {
				return false;
			}

			const hookConstructor: unknown = (onDisposeHook as { constructor?: unknown }).constructor;

			if (typeof hookConstructor === "function" && (hookConstructor as { name?: unknown }).name === "AsyncFunction") {
				return true;
			}

			return Object.prototype.toString.call(onDisposeHook) === "[object AsyncFunction]";
		});
	}

	private hasTrackedDisposersForTokenRecursively(scopeNode: DIContainer, dependencyKeySymbol: symbol): boolean {
		const localDisposers: Array<() => Promise<void>> | undefined = scopeNode.DISPOSERS_BY_TOKEN.get(dependencyKeySymbol);

		if (localDisposers && localDisposers.length > 0) {
			return true;
		}

		for (const childScope of scopeNode.CHILD_SCOPES) {
			if (childScope.PROVIDERS.has(dependencyKeySymbol)) {
				continue;
			}

			if (this.hasTrackedDisposersForTokenRecursively(childScope, dependencyKeySymbol)) {
				return true;
			}
		}

		return false;
	}

	private isProviderCleanupPending(dependencyKeySymbol: symbol): boolean {
		const cleanupState:
			| {
					isSettled: boolean;
					promise: Promise<void>;
			  }
			| undefined = this.PENDING_PROVIDER_CLEANUPS.get(dependencyKeySymbol);

		return cleanupState !== undefined && !cleanupState.isSettled;
	}

	private isRegistrationCurrent(ownerScope: DIContainer, tokenSymbol: symbol, registration: IProviderRegistration<unknown>): boolean {
		const currentRegistrations: Array<IProviderRegistration<unknown>> | undefined = ownerScope.PROVIDERS.get(tokenSymbol);

		return currentRegistrations?.includes(registration) ?? false;
	}

	private logProviderCleanupFailure(dependencyKeySymbol: symbol, error: unknown): void {
		this.LOGGER.error("Provider cleanup failed during token overwrite", {
			context: {
				error: toError(error).message,
				scopeId: this.id,
				token: this.describeToken(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private queueProviderCleanup(dependencyKeySymbol: symbol, cleanupPromise: Promise<void>): void {
		const trackedCleanupPromise: Promise<void> = cleanupPromise.catch((error: unknown) => {
			this.logProviderCleanupFailure(dependencyKeySymbol, error);

			throw toError(error);
		});

		const cleanupState: {
			isSettled: boolean;
			promise: Promise<void>;
		} = {
			isSettled: false,
			promise: trackedCleanupPromise,
		};

		const markCleanupSettled = (): void => {
			cleanupState.isSettled = true;

			if (this.PENDING_PROVIDER_CLEANUPS.get(dependencyKeySymbol) === cleanupState) {
				this.PENDING_PROVIDER_CLEANUPS.delete(dependencyKeySymbol);
			}
		};

		this.PENDING_PROVIDER_CLEANUPS.set(dependencyKeySymbol, cleanupState);
		void trackedCleanupPromise.then(markCleanupSettled, markCleanupSettled);
		void trackedCleanupPromise.catch((): void => undefined);
	}

	private async waitForProviderCleanup(dependencyKeySymbol: symbol): Promise<void> {
		const cleanupState:
			| {
					isSettled: boolean;
					promise: Promise<void>;
			  }
			| undefined = this.PENDING_PROVIDER_CLEANUPS.get(dependencyKeySymbol);

		if (!cleanupState) {
			return;
		}

		await cleanupState.promise;
	}
}
