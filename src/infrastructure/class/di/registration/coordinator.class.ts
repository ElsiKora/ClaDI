import type { IAliasProvider, IClassProvider, IFactoryProvider, ILazyProvider, ILogger } from "@domain/interface";
import type { Provider, Token } from "@domain/type";
import type { IProviderRegistration } from "@infrastructure/class/di/interface/provider";

import { EDependencyLifecycle, EDiContainerDuplicateProviderPolicy, EProviderType } from "@domain/enum";
import { BaseError } from "@infrastructure/class/base/error.class";

const ASYNC_FUNCTION_PROTOTYPE: object = Object.getPrototypeOf(async function asyncFactoryPrototypeMarker(): Promise<void> {
	await Promise.resolve();
}) as object;

export class RegistrationCoordinator {
	private readonly ASSERT_KEY: <T>(dependencyKey: Token<T>) => symbol;

	private readonly DESCRIBE_KEY: (dependencyKeySymbol: symbol) => string;

	private readonly DUPLICATE_PROVIDER_POLICY: EDiContainerDuplicateProviderPolicy;

	private readonly GET_PROVIDER_REGISTRATION_COUNT: () => number;

	private readonly GET_REGISTRATIONS_FOR_PROVIDER_KEY: (providerKey: symbol) => Array<IProviderRegistration<unknown>>;

	private readonly GET_SCOPE_ID: () => string;

	private readonly LOGGER: ILogger;

	private readonly ON_AFTER_SINGLE_BINDING_REGISTERED: (providerKey: symbol, existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>, registration: IProviderRegistration<unknown>) => void;

	private readonly ON_BEFORE_OVERWRITE: (providerKey: symbol) => void;

	private readonly SET_REGISTRATIONS_FOR_PROVIDER_KEY: (providerKey: symbol, registrations: Array<IProviderRegistration<unknown>>) => void;

	constructor(options: {
		assertKey: <T>(dependencyKey: Token<T>) => symbol;
		describeKey: (dependencyKeySymbol: symbol) => string;
		duplicateProviderPolicy: EDiContainerDuplicateProviderPolicy;
		getProviderRegistrationCount: () => number;
		getRegistrationsForProviderKey: (providerKey: symbol) => Array<IProviderRegistration<unknown>>;
		getScopeId: () => string;
		logger: ILogger;
		onAfterSingleBindingRegistered: (providerKey: symbol, existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>, registration: IProviderRegistration<unknown>) => void;
		onBeforeOverwrite: (providerKey: symbol) => void;
		setRegistrationsForProviderKey: (providerKey: symbol, registrations: Array<IProviderRegistration<unknown>>) => void;
	}) {
		this.ASSERT_KEY = options.assertKey;
		this.DESCRIBE_KEY = options.describeKey;
		this.DUPLICATE_PROVIDER_POLICY = options.duplicateProviderPolicy;
		this.GET_PROVIDER_REGISTRATION_COUNT = options.getProviderRegistrationCount;
		this.GET_REGISTRATIONS_FOR_PROVIDER_KEY = options.getRegistrationsForProviderKey;
		this.GET_SCOPE_ID = options.getScopeId;
		this.LOGGER = options.logger;
		this.ON_AFTER_SINGLE_BINDING_REGISTERED = options.onAfterSingleBindingRegistered;
		this.ON_BEFORE_OVERWRITE = options.onBeforeOverwrite;
		this.SET_REGISTRATIONS_FOR_PROVIDER_KEY = options.setRegistrationsForProviderKey;
	}

	public registerProvider(provider: Provider): void {
		const providerKey: symbol = this.ASSERT_KEY(provider.provide);
		const providerType: EProviderType = this.getProviderType(provider);
		const existingRegistrations: Array<IProviderRegistration<unknown>> = this.GET_REGISTRATIONS_FOR_PROVIDER_KEY(providerKey);
		const isMultiBindingProvider: boolean = this.isMultiBindingProvider(provider);

		if (isMultiBindingProvider && existingRegistrations.some((registration: IProviderRegistration<unknown>) => !registration.isMultiBinding)) {
			this.handleMultiBindingConflict(providerKey);
		}

		if (!isMultiBindingProvider && existingRegistrations.some((registration: IProviderRegistration<unknown>) => registration.isMultiBinding)) {
			this.handleMultiBindingConflict(providerKey);
		}

		if (!isMultiBindingProvider) {
			this.handleDuplicateProviderRegistration(providerKey, existingRegistrations);
		}

		this.validateProvider(provider, providerType);
		const lifecycle: EDependencyLifecycle = provider.lifecycle ?? this.defaultLifecycle(providerType);
		const registration: IProviderRegistration<unknown> = this.createProviderRegistration(provider, lifecycle, providerType, providerKey);

		if (isMultiBindingProvider) {
			this.SET_REGISTRATIONS_FOR_PROVIDER_KEY(providerKey, [...existingRegistrations, registration]);

			return;
		}

		if (existingRegistrations.length > 0) {
			this.ON_BEFORE_OVERWRITE(providerKey);
		}

		this.SET_REGISTRATIONS_FOR_PROVIDER_KEY(providerKey, [registration]);
		this.ON_AFTER_SINGLE_BINDING_REGISTERED(providerKey, existingRegistrations, registration);
	}

	private createProviderRegistration(provider: Provider, lifecycle: EDependencyLifecycle, providerType: EProviderType, providerKey: symbol): IProviderRegistration<unknown> {
		const isAsyncFactory: boolean = providerType === EProviderType.FACTORY ? this.isAsyncFactoryFunction((provider as IFactoryProvider<unknown>).useFactory) : false;
		const isMultiBinding: boolean = this.isMultiBindingProvider(provider);
		const cacheKey: symbol = isMultiBinding ? Symbol(`${String(providerKey)}:multi:${String(this.GET_PROVIDER_REGISTRATION_COUNT())}`) : providerKey;

		return {
			cacheKey,
			isAsyncFactory,
			isMultiBinding,
			lifecycle,
			provider,
			type: providerType,
		};
	}

	private defaultLifecycle(providerType: EProviderType): EDependencyLifecycle {
		if (providerType === EProviderType.VALUE) {
			return EDependencyLifecycle.SINGLETON;
		}

		return EDependencyLifecycle.TRANSIENT;
	}

	private ensureDependenciesAreValid(dependencies: ReadonlyArray<Token<unknown>> | undefined, providerKey: Token<unknown>): void {
		if (dependencies === undefined) {
			return;
		}

		if (!Array.isArray(dependencies)) {
			throw new BaseError("Provider deps must be an array", {
				code: "PROVIDER_DEPS_NOT_ARRAY",
				context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(providerKey)) },
				source: "DIContainer",
			});
		}

		for (const dependencyKey of dependencies) {
			this.ASSERT_KEY(dependencyKey as Token<unknown>);
		}
	}

	private getProviderType(provider: Provider): EProviderType {
		const isAliasProvider: boolean = "useExisting" in provider;
		const isClassProvider: boolean = "useClass" in provider;
		const isFactoryProvider: boolean = "useFactory" in provider;
		const isLazyProvider: boolean = "useLazy" in provider;
		const isValueProvider: boolean = "useValue" in provider;

		const strategyCount: number = Number(isAliasProvider) + Number(isClassProvider) + Number(isFactoryProvider) + Number(isLazyProvider) + Number(isValueProvider);

		if (strategyCount !== 1) {
			throw new BaseError("Provider must define exactly one strategy", {
				code: "PROVIDER_INVALID_STRATEGY",
				context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
				source: "DIContainer",
			});
		}

		if (isValueProvider) return EProviderType.VALUE;

		if (isFactoryProvider) return EProviderType.FACTORY;

		if (isLazyProvider) return EProviderType.LAZY;

		if (isClassProvider) return EProviderType.CLASS;

		return EProviderType.ALIAS;
	}

	private handleDuplicateProviderRegistration(providerKey: symbol, existingRegistrations: ReadonlyArray<IProviderRegistration<unknown>>): void {
		if (existingRegistrations.length === 0) {
			return;
		}

		const providerKeyDescription: string = this.DESCRIBE_KEY(providerKey);
		const duplicateRegistrationMessage: string = `Provider with token already registered in scope: ${providerKeyDescription}`;

		if (this.DUPLICATE_PROVIDER_POLICY === EDiContainerDuplicateProviderPolicy.ERROR) {
			throw new BaseError("Provider with token already registered in scope", {
				code: "PROVIDER_DUPLICATE_REGISTRATION",
				context: {
					scopeId: this.GET_SCOPE_ID(),
					token: providerKeyDescription,
				},
				source: "DIContainer",
			});
		}

		if (this.DUPLICATE_PROVIDER_POLICY === EDiContainerDuplicateProviderPolicy.WARN) {
			this.LOGGER.warn(duplicateRegistrationMessage, {
				source: "DIContainer",
			});
		}
	}

	private handleMultiBindingConflict(providerKey: symbol): never {
		throw new BaseError("Token cannot mix multi-binding and single-binding providers", {
			code: "PROVIDER_MULTI_BINDING_CONFLICT",
			context: {
				scopeId: this.GET_SCOPE_ID(),
				token: this.DESCRIBE_KEY(providerKey),
			},
			source: "DIContainer",
		});
	}

	private isAsyncFactoryFunction(factoryFunction: (...arguments_: Array<never>) => unknown): boolean {
		return Object.getPrototypeOf(factoryFunction) === ASYNC_FUNCTION_PROTOTYPE;
	}

	private isConstructable(candidate: unknown): boolean {
		if (typeof candidate !== "function") {
			return false;
		}

		const candidateAsConstructor: { prototype?: { constructor?: unknown } } = candidate as { prototype?: { constructor?: unknown } };
		const prototype: { constructor?: unknown } | undefined = candidateAsConstructor.prototype;

		if (!prototype || typeof prototype !== "object") {
			return false;
		}

		return prototype.constructor === candidate;
	}

	private isMultiBindingProvider(provider: Provider): boolean {
		return provider.isMultiBinding === true;
	}

	private validateProvider(provider: Provider, providerType: EProviderType): void {
		if (provider.afterResolve && typeof provider.afterResolve !== "function") {
			throw new BaseError("Provider afterResolve must be a function", {
				code: "PROVIDER_AFTER_RESOLVE_INVALID",
				context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
				source: "DIContainer",
			});
		}

		if (provider.onInit && typeof provider.onInit !== "function") {
			throw new BaseError("Provider onInit must be a function", {
				code: "PROVIDER_ON_INIT_INVALID",
				context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
				source: "DIContainer",
			});
		}

		if (provider.onDispose && typeof provider.onDispose !== "function") {
			throw new BaseError("Provider onDispose must be a function", {
				code: "PROVIDER_ON_DISPOSE_INVALID",
				context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
				source: "DIContainer",
			});
		}

		if (providerType === EProviderType.ALIAS) {
			this.ASSERT_KEY((provider as IAliasProvider<unknown>).useExisting);

			return;
		}

		if (providerType === EProviderType.CLASS) {
			const classProvider: IClassProvider<unknown> = provider as IClassProvider<unknown>;

			if (!this.isConstructable(classProvider.useClass)) {
				throw new BaseError("Class provider useClass must be a constructable class", {
					code: "PROVIDER_CLASS_INVALID",
					context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
					source: "DIContainer",
				});
			}

			this.ensureDependenciesAreValid(classProvider.deps, provider.provide);

			return;
		}

		if (providerType === EProviderType.LAZY) {
			this.ASSERT_KEY((provider as ILazyProvider<() => Promise<unknown>>).useLazy);

			return;
		}

		if (providerType === EProviderType.FACTORY) {
			const factoryProvider: IFactoryProvider<unknown> = provider as IFactoryProvider<unknown>;

			if (typeof factoryProvider.useFactory !== "function") {
				throw new BaseError("Factory provider useFactory must be a function", {
					code: "PROVIDER_FACTORY_INVALID",
					context: { token: this.DESCRIBE_KEY(this.ASSERT_KEY(provider.provide)) },
					source: "DIContainer",
				});
			}

			this.ensureDependenciesAreValid(factoryProvider.deps, provider.provide);
		}
	}
}
