import type { ILogger } from "@domain/interface";
import type { Token } from "@domain/type";
import type { IProviderLookup, IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle, EDiContainerCaptiveDependencyPolicy } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";

export class CaptiveDependencyCoordinator {
	private readonly CAPTIVE_DEPENDENCY_POLICY: EDiContainerCaptiveDependencyPolicy;

	private readonly LOGGER: ILogger;

	private readonly STRINGIFY_KEY: (dependencyKeySymbol: symbol) => string;

	constructor(options: { captiveDependencyPolicy: EDiContainerCaptiveDependencyPolicy; logger: ILogger; stringifyKey: (dependencyKeySymbol: symbol) => string }) {
		this.CAPTIVE_DEPENDENCY_POLICY = options.captiveDependencyPolicy;
		this.LOGGER = options.logger;
		this.STRINGIFY_KEY = options.stringifyKey;
	}

	public handleCaptiveDependency(parentDependencyKeySymbol: symbol, dependencyKeySymbol: symbol, dependencyLifecycle: EDependencyLifecycle, scopeId: string): void {
		if (this.CAPTIVE_DEPENDENCY_POLICY === EDiContainerCaptiveDependencyPolicy.DISABLED) {
			return;
		}

		const parentTokenDescription: string = this.STRINGIFY_KEY(parentDependencyKeySymbol);
		const dependencyTokenDescription: string = this.STRINGIFY_KEY(dependencyKeySymbol);
		const warningMessage: string = `Singleton provider ${parentTokenDescription} depends on ${dependencyLifecycle} provider ${dependencyTokenDescription}`;

		if (this.CAPTIVE_DEPENDENCY_POLICY === EDiContainerCaptiveDependencyPolicy.ERROR) {
			throw new BaseError("Singleton provider depends on non-singleton provider", {
				code: "CAPTIVE_DEPENDENCY",
				context: {
					dependencyLifecycle,
					dependencyToken: dependencyTokenDescription,
					providerToken: parentTokenDescription,
					scopeId,
				},
				source: "DIContainer",
			});
		}

		this.LOGGER.warn(warningMessage, {
			context: {
				dependencyLifecycle,
				dependencyToken: dependencyTokenDescription,
				providerToken: parentTokenDescription,
			},
			source: "DIContainer",
		});
	}

	public validateCaptiveDependency<TScope extends object>(parentRegistration: IProviderRegistration<unknown>, dependencyKey: Token<unknown>, resolutionScope: TScope, assertKey: <T>(dependencyKey: Token<T>) => symbol, findProviderInScope: (scope: TScope, dependencyKeySymbol: symbol) => IProviderLookup<TScope>, scopeId: string): void {
		if (parentRegistration.lifecycle !== EDependencyLifecycle.SINGLETON) {
			return;
		}

		const dependencyKeySymbol: symbol = assertKey(dependencyKey);
		const dependencyLookup: IProviderLookup<TScope> = findProviderInScope(resolutionScope, dependencyKeySymbol);
		const dependencyRegistration: IProviderRegistration<unknown> | undefined = dependencyLookup.registration;

		if (!dependencyRegistration || dependencyRegistration.lifecycle === EDependencyLifecycle.SINGLETON) {
			return;
		}

		this.handleCaptiveDependency(assertKey(parentRegistration.provider.provide), dependencyKeySymbol, dependencyRegistration.lifecycle, scopeId);
	}
}
