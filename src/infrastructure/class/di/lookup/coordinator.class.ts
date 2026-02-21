import type { IAliasProvider, IClassProvider, IFactoryProvider, ILazyProvider } from "@domain/interface";
import type { Token } from "@domain/type";
import type { DIContainer } from "@infrastructure/class/di/container.class";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EProviderType } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";

export class LookupCoordinator {
	public assertSingleBindingLookup(dependencyKeySymbol: symbol, lookup: IProviderLookup<DIContainer>, describeKey: (dependencyKeySymbol: symbol) => string): IProviderRegistration<unknown> {
		const registrations: ReadonlyArray<IProviderRegistration<unknown>> = lookup.registrations ?? [];
		const hasMultiBindingRegistrations: boolean = registrations.some((registration: IProviderRegistration<unknown>) => registration.isMultiBinding);

		if (!lookup.registration) {
			throw new BaseError("Token not found in container", {
				code: "TOKEN_NOT_FOUND",
				context: {
					lookupPath: lookup.lookupPath,
					token: describeKey(dependencyKeySymbol),
				},
				source: "DIContainer",
			});
		}

		if (hasMultiBindingRegistrations || registrations.length > 1) {
			throw new BaseError("Token has multiple providers; use resolveAll() or resolveAllAsync()", {
				code: "TOKEN_MULTI_BINDING",
				context: {
					lookupPath: lookup.lookupPath,
					token: describeKey(dependencyKeySymbol),
				},
				source: "DIContainer",
			});
		}

		return lookup.registration;
	}

	public findProvider(requestScope: DIContainer, dependencyKeySymbol: symbol, getParent: (scope: DIContainer) => DIContainer | undefined, getScopeId: (scope: DIContainer) => string, getRegistrationsForScope: (scope: DIContainer, dependencyKeySymbol: symbol) => Array<IProviderRegistration<unknown>> | undefined): IProviderLookup<DIContainer> {
		return this.findProviderInHierarchy(requestScope, requestScope, dependencyKeySymbol, [], getParent, getScopeId, getRegistrationsForScope);
	}

	public getDependencyTokens(registration: IProviderRegistration<unknown>): ReadonlyArray<Token<unknown>> {
		if (registration.type === EProviderType.CLASS) {
			return (registration.provider as IClassProvider<unknown>).deps ?? [];
		}

		if (registration.type === EProviderType.FACTORY) {
			return (registration.provider as IFactoryProvider<unknown>).deps ?? [];
		}

		if (registration.type === EProviderType.LAZY) {
			return [(registration.provider as ILazyProvider<() => Promise<unknown>>).useLazy];
		}

		if (registration.type === EProviderType.ALIAS) {
			return [(registration.provider as IAliasProvider<unknown>).useExisting];
		}

		return [];
	}

	private findProviderInHierarchy(requestScope: DIContainer, currentScope: DIContainer, dependencyKeySymbol: symbol, lookupPath: Array<string>, getParent: (scope: DIContainer) => DIContainer | undefined, getScopeId: (scope: DIContainer) => string, getRegistrationsForScope: (scope: DIContainer, dependencyKeySymbol: symbol) => Array<IProviderRegistration<unknown>> | undefined): IProviderLookup<DIContainer> {
		lookupPath.push(getScopeId(currentScope));
		const registrations: Array<IProviderRegistration<unknown>> | undefined = getRegistrationsForScope(currentScope, dependencyKeySymbol);
		const registration: IProviderRegistration<unknown> | undefined = registrations?.[registrations.length - 1];

		if (registration) {
			return {
				lookupPath,
				owner: currentScope,
				registration,
				registrations,
			};
		}

		const parentScope: DIContainer | undefined = getParent(currentScope);

		if (!parentScope) {
			return {
				lookupPath,
				owner: requestScope,
			};
		}

		return this.findProviderInHierarchy(requestScope, parentScope, dependencyKeySymbol, lookupPath, getParent, getScopeId, getRegistrationsForScope);
	}
}
