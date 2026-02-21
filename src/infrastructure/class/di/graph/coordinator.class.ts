import type { EDiContainerCaptiveDependencyPolicy } from "@domain/enum";
import type { ILogger } from "@domain/interface";
import type { Token } from "@domain/type";
import type { DIContainer } from "@infrastructure/class/di/container.class";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";
import { CaptiveDependencyCoordinator } from "@infrastructure/class/di/captive/coordinator.class";
import { LookupCoordinator } from "@infrastructure/class/di/lookup/coordinator.class";

export class DependencyGraphCoordinator {
	private readonly ASSERT_KEY: <T>(dependencyKey: Token<T>) => symbol;

	private readonly CAPTIVE_COORDINATOR: CaptiveDependencyCoordinator;

	private readonly DESCRIBE_KEY: (dependencyKeySymbol: symbol) => string;

	private readonly GET_CHILD_SCOPES: (scopeNode: DIContainer) => ReadonlyArray<DIContainer>;

	private readonly GET_CURRENT_SCOPE_ID: () => string;

	private readonly GET_PARENT: (scopeNode: DIContainer) => DIContainer | undefined;

	private readonly GET_REGISTRATIONS_BY_TOKEN: (scopeNode: DIContainer) => ReadonlyMap<symbol, ReadonlyArray<IProviderRegistration<unknown>>>;

	private readonly GET_REGISTRATIONS_FOR_SCOPE: (scopeNode: DIContainer, dependencyKeySymbol: symbol) => Array<IProviderRegistration<unknown>> | undefined;

	private readonly GET_SCOPE_ID: (scopeNode: DIContainer) => string;

	private readonly LOOKUP_COORDINATOR: LookupCoordinator;

	constructor(options: {
		assertKey: <T>(dependencyKey: Token<T>) => symbol;
		captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy;
		describeKey: (dependencyKeySymbol: symbol) => string;
		getChildScopes: (scopeNode: DIContainer) => ReadonlyArray<DIContainer>;
		getCurrentScopeId: () => string;
		getParent: (scopeNode: DIContainer) => DIContainer | undefined;
		getRegistrationsByToken: (scopeNode: DIContainer) => ReadonlyMap<symbol, ReadonlyArray<IProviderRegistration<unknown>>>;
		getRegistrationsForScope: (scopeNode: DIContainer, dependencyKeySymbol: symbol) => Array<IProviderRegistration<unknown>> | undefined;
		getScopeId: (scopeNode: DIContainer) => string;
		logger: ILogger;
		lookupCoordinator?: LookupCoordinator;
	}) {
		this.ASSERT_KEY = options.assertKey;
		this.CAPTIVE_COORDINATOR = new CaptiveDependencyCoordinator({
			captiveDependencyPolicy: options.captiveDependencyPolicy,
			logger: options.logger,
			stringifyKey: options.describeKey,
		});
		this.DESCRIBE_KEY = options.describeKey;
		this.GET_CHILD_SCOPES = options.getChildScopes;
		this.GET_CURRENT_SCOPE_ID = options.getCurrentScopeId;
		this.GET_PARENT = options.getParent;
		this.GET_REGISTRATIONS_BY_TOKEN = options.getRegistrationsByToken;
		this.GET_REGISTRATIONS_FOR_SCOPE = options.getRegistrationsForScope;
		this.GET_SCOPE_ID = options.getScopeId;
		this.LOOKUP_COORDINATOR = options.lookupCoordinator ?? new LookupCoordinator();
	}

	public assertSingleBindingLookup(dependencyKeySymbol: symbol, lookup: IProviderLookup<DIContainer>): IProviderRegistration<unknown> {
		return this.LOOKUP_COORDINATOR.assertSingleBindingLookup(dependencyKeySymbol, lookup, this.DESCRIBE_KEY);
	}

	public findProvider(scope: DIContainer, dependencyKeySymbol: symbol): IProviderLookup<DIContainer> {
		return this.LOOKUP_COORDINATOR.findProvider(scope, dependencyKeySymbol, this.GET_PARENT, this.GET_SCOPE_ID, this.GET_REGISTRATIONS_FOR_SCOPE);
	}

	public getDependencyTokens(registration: IProviderRegistration<unknown>): ReadonlyArray<Token<unknown>> {
		return this.LOOKUP_COORDINATOR.getDependencyTokens(registration);
	}

	public validateCaptiveDependency(parentRegistration: IProviderRegistration<unknown>, dependencyToken: Token<unknown>, resolutionScope: DIContainer): void {
		this.CAPTIVE_COORDINATOR.validateCaptiveDependency(parentRegistration, dependencyToken, resolutionScope, this.ASSERT_KEY, (scopeNode: DIContainer, dependencyKeySymbol: symbol): IProviderLookup<DIContainer> => this.findProvider(scopeNode, dependencyKeySymbol), this.GET_CURRENT_SCOPE_ID());
	}

	public validateScopeTree(scope: DIContainer): void {
		this.validateScope(scope);

		for (const childScope of this.GET_CHILD_SCOPES(scope)) {
			this.validateScopeTree(childScope);
		}
	}

	private createMultiBindingError(dependencyKeySymbol: symbol, lookupPath: ReadonlyArray<string>, requestedByKeySymbol: symbol): BaseError {
		return new BaseError("Token has multiple providers; use resolveAll() or resolveAllAsync()", {
			code: "TOKEN_MULTI_BINDING",
			context: {
				lookupPath,
				requestedBy: this.DESCRIBE_KEY(requestedByKeySymbol),
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	private createTokenNotFoundError(dependencyKeySymbol: symbol, lookupPath: ReadonlyArray<string>, requestedByKeySymbol: symbol): BaseError {
		return new BaseError("Token not found in container", {
			code: "TOKEN_NOT_FOUND",
			context: {
				lookupPath,
				requestedBy: this.DESCRIBE_KEY(requestedByKeySymbol),
				token: this.DESCRIBE_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
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

	private validateRegistrationGraph(registration: IProviderRegistration<unknown>, providerOwnerScope: DIContainer, requestScope: DIContainer, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>): void {
		const providerKeySymbol: symbol = this.ASSERT_KEY(registration.provider.provide);
		this.throwIfCircularDependency(providerKeySymbol, path, visitedTokens);
		const nextVisitedTokens: Set<symbol> = new Set<symbol>(visitedTokens);
		nextVisitedTokens.add(providerKeySymbol);
		const nextPath: Array<symbol> = [...path, providerKeySymbol];
		const dependencyResolutionScope: DIContainer = registration.lifecycle === EDependencyLifecycle.SINGLETON ? providerOwnerScope : requestScope;

		for (const dependencyToken of this.getDependencyTokens(registration)) {
			const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyToken);
			const dependencyLookup: IProviderLookup<DIContainer> = this.findProvider(dependencyResolutionScope, dependencyKeySymbol);

			if (!dependencyLookup.registration) {
				throw this.createTokenNotFoundError(dependencyKeySymbol, dependencyLookup.lookupPath, providerKeySymbol);
			}

			const dependencyRegistrations: ReadonlyArray<IProviderRegistration<unknown>> = dependencyLookup.registrations ?? [dependencyLookup.registration];

			const hasMultiBindingRegistrations: boolean = dependencyRegistrations.length > 1 || dependencyRegistrations.some((dependencyRegistration: IProviderRegistration<unknown>) => dependencyRegistration.isMultiBinding);

			if (hasMultiBindingRegistrations) {
				throw this.createMultiBindingError(dependencyKeySymbol, dependencyLookup.lookupPath, providerKeySymbol);
			}

			this.validateRegistrationGraph(dependencyLookup.registration, dependencyLookup.owner, dependencyResolutionScope, nextPath, nextVisitedTokens);
		}
	}

	private validateScope(scope: DIContainer): void {
		for (const registrations of this.GET_REGISTRATIONS_BY_TOKEN(scope).values()) {
			for (const registration of registrations) {
				this.validateRegistrationGraph(registration, scope, scope, [], new Set<symbol>());
			}
		}
	}
}
