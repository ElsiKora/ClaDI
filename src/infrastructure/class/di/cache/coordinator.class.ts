import type { EDependencyLifecycle } from "@domain/enum";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle as EDependencyLifecycleEnum } from "@domain/enum";

export class CacheCoordinator {
	public clearScopedCachesRecursivelyForCacheKeys<TScope>(cacheKeys: ReadonlyArray<symbol>, providerKey: symbol, scope: TScope, getChildScopes: (scopeNode: TScope) => ReadonlyArray<TScope>, getScopedCache: (scopeNode: TScope) => Map<symbol, unknown>, hasLocalProvider: (scopeNode: TScope, dependencyKey: symbol) => boolean): void {
		const scopedCache: Map<symbol, unknown> = getScopedCache(scope);

		for (const cacheKey of cacheKeys) {
			scopedCache.delete(cacheKey);
		}

		for (const childScope of getChildScopes(scope)) {
			if (hasLocalProvider(childScope, providerKey)) {
				continue;
			}

			this.clearScopedCachesRecursivelyForCacheKeys(cacheKeys, providerKey, childScope, getChildScopes, getScopedCache, hasLocalProvider);
		}
	}

	public getOrCreateSingletonOwnerCache<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, ownerScope: TOwnerScope): Map<symbol, unknown> {
		const existingOwnerCache: Map<symbol, unknown> | undefined = rootSingletonCache.get(ownerScope);

		if (existingOwnerCache) {
			return existingOwnerCache;
		}

		const ownerCache: Map<symbol, unknown> = new Map<symbol, unknown>();
		rootSingletonCache.set(ownerScope, ownerCache);

		return ownerCache;
	}

	public getRootSingletonCacheSize<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>): number {
		let totalEntries: number = 0;

		for (const ownerCache of rootSingletonCache.values()) {
			totalEntries += ownerCache.size;
		}

		return totalEntries;
	}

	public getScopedCacheForLifecycle<TOwnerScope extends object>(lifecycle: EDependencyLifecycle, requestScopedCache: Map<symbol, unknown>, rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, providerOwner: TOwnerScope): Map<symbol, unknown> | undefined {
		if (lifecycle === EDependencyLifecycleEnum.SINGLETON) {
			return this.getOrCreateSingletonOwnerCache(rootSingletonCache, providerOwner);
		}

		if (lifecycle === EDependencyLifecycleEnum.SCOPED) {
			return requestScopedCache;
		}

		return undefined;
	}

	public hasScopedCacheForLookup(lookup: IProviderLookup, scopedCache: Map<symbol, unknown>, dependencyKey: symbol): boolean {
		const registrations: ReadonlyArray<IProviderRegistration<unknown>> = lookup.registrations ?? [];

		if (registrations.length === 0) {
			return scopedCache.has(dependencyKey);
		}

		let hasScopedRegistration: boolean = false;

		for (const registration of registrations) {
			if (registration.lifecycle !== EDependencyLifecycleEnum.SCOPED) {
				continue;
			}

			hasScopedRegistration = true;

			if (scopedCache.has(registration.cacheKey)) {
				return true;
			}
		}

		if (hasScopedRegistration) {
			return false;
		}

		return scopedCache.has(dependencyKey);
	}

	public hasSingletonCacheForAnyOwner<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, dependencyKey: symbol, getRegistrationsForOwner: (ownerScope: TOwnerScope, dependencyKey: symbol) => ReadonlyArray<IProviderRegistration<unknown>> | undefined): boolean {
		for (const [ownerScope, ownerCache] of rootSingletonCache.entries()) {
			if (ownerCache.has(dependencyKey)) {
				return true;
			}

			const registrations: ReadonlyArray<IProviderRegistration<unknown>> | undefined = getRegistrationsForOwner(ownerScope, dependencyKey);

			if (!registrations) {
				continue;
			}

			for (const registration of registrations) {
				if (ownerCache.has(registration.cacheKey)) {
					return true;
				}
			}
		}

		return false;
	}

	public hasSingletonCacheForOwner<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, ownerScope: TOwnerScope, registrations: ReadonlyArray<IProviderRegistration<unknown>> | undefined): boolean {
		const ownerCache: Map<symbol, unknown> | undefined = rootSingletonCache.get(ownerScope);

		if (!ownerCache || !registrations || registrations.length === 0) {
			return false;
		}

		for (const registration of registrations) {
			if (ownerCache.has(registration.cacheKey)) {
				return true;
			}
		}

		return false;
	}

	public removeSingletonCacheForOwnerCacheKeys<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, ownerScope: TOwnerScope, cacheKeys: ReadonlyArray<symbol>): void {
		const ownerCache: Map<symbol, unknown> | undefined = rootSingletonCache.get(ownerScope);

		if (!ownerCache) {
			return;
		}

		for (const cacheKey of cacheKeys) {
			ownerCache.delete(cacheKey);
		}

		if (ownerCache.size === 0) {
			rootSingletonCache.delete(ownerScope);
		}
	}

	public removeSingletonCacheForOwnerRegistrations<TOwnerScope extends object>(rootSingletonCache: Map<TOwnerScope, Map<symbol, unknown>>, ownerScope: TOwnerScope, ownerRegistrationsByToken: ReadonlyMap<symbol, ReadonlyArray<IProviderRegistration<unknown>>>): void {
		const singletonCacheKeys: Array<symbol> = [];

		for (const registrations of ownerRegistrationsByToken.values()) {
			for (const registration of registrations) {
				if (registration.lifecycle !== EDependencyLifecycleEnum.SINGLETON) {
					continue;
				}

				singletonCacheKeys.push(registration.cacheKey);
			}
		}

		if (singletonCacheKeys.length === 0) {
			return;
		}

		this.removeSingletonCacheForOwnerCacheKeys(rootSingletonCache, ownerScope, singletonCacheKeys);
	}
}
