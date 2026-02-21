import type { ILogger, IProviderBase } from "@domain/interface";
import type { Provider } from "@domain/type";

import { BaseError } from "@infrastructure/class/base/error.class";

export class DisposerCoordinator {
	private readonly LOGGER: ILogger;

	private readonly STRINGIFY_KEY: (dependencyKeySymbol: symbol) => string;

	private readonly TO_ERROR: (error: unknown) => Error;

	constructor(options: { logger: ILogger; stringifyKey: (dependencyKeySymbol: symbol) => string; toError: (error: unknown) => Error }) {
		this.LOGGER = options.logger;
		this.STRINGIFY_KEY = options.stringifyKey;
		this.TO_ERROR = options.toError;
	}

	public disposeCachedInstancesForTokenRecursively<TScope extends { id: string }>(
		dependencyKeySymbol: symbol,
		scope: TScope,
		options: {
			deleteProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => void;
			getChildScopes: (scopeNode: TScope) => ReadonlyArray<TScope>;
			getProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => Array<() => Promise<void>> | undefined;
			hasLocalProvider: (scopeNode: TScope, dependencyKeySymbol: symbol) => boolean;
			removeTrackedDisposer?: (scopeNode: TScope, disposer: () => Promise<void>) => void;
		},
	): void {
		void this.disposeCachedInstancesForTokenRecursivelyAsync(dependencyKeySymbol, scope, options).catch((error: unknown) => {
			try {
				this.LOGGER.error("Provider cleanup failed during token overwrite", {
					context: {
						error: this.TO_ERROR(error).message,
						scopeId: scope.id,
						token: this.STRINGIFY_KEY(dependencyKeySymbol),
					},
					source: "DIContainer",
				});
			} catch {
				// Ignore logger failures to avoid unhandled rejections in fire-and-forget cleanup.
			}
		});
	}

	public async disposeCachedInstancesForTokenRecursivelyAsync<TScope extends { id: string }>(
		dependencyKeySymbol: symbol,
		scope: TScope,
		options: {
			deleteProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => void;
			getChildScopes: (scopeNode: TScope) => ReadonlyArray<TScope>;
			getProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => Array<() => Promise<void>> | undefined;
			hasLocalProvider: (scopeNode: TScope, dependencyKeySymbol: symbol) => boolean;
			removeTrackedDisposer?: (scopeNode: TScope, disposer: () => Promise<void>) => void;
		},
	): Promise<void> {
		const callbackErrors: Array<{
			error: Error;
			scopeId: string;
		}> = [];

		await this.disposeCachedInstancesForTokenRecursivelyInternal(dependencyKeySymbol, scope, options, callbackErrors);

		if (callbackErrors.length === 0) {
			return;
		}

		throw new BaseError("Provider cleanup failed during token cleanup", {
			cause: callbackErrors[0].error,
			code: "PROVIDER_TOKEN_CLEANUP_FAILED",
			context: {
				errorCount: callbackErrors.length,
				errors: callbackErrors.map((callbackError: { error: Error; scopeId: string }) => ({
					error: callbackError.error.message,
					scopeId: callbackError.scopeId,
				})),
				token: this.STRINGIFY_KEY(dependencyKeySymbol),
			},
			source: "DIContainer",
		});
	}

	public registerDisposer<TScope extends { id: string }>(
		disposerScope: TScope,
		provider: Provider,
		instance: unknown,
		dependencyKeySymbol: symbol,
		options: {
			getProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => Array<() => Promise<void>> | undefined;
			pushDisposer: (scopeNode: TScope, disposer: () => Promise<void>) => void;
			setProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol, disposers: Array<() => Promise<void>>) => void;
		},
		registrationOptions: {
			shouldTrack?: boolean;
		} = {},
	): (() => Promise<void>) | undefined {
		const callbacks: Array<() => Promise<void> | void> = [];
		const providerWithHooks: IProviderBase<unknown> = provider as IProviderBase<unknown>;

		if (providerWithHooks.onDispose) {
			callbacks.push(() => providerWithHooks.onDispose?.(instance));
		}

		if (instance && typeof instance === "object") {
			const disposable: { [key: symbol]: (() => Promise<void> | void) | undefined; close?: () => Promise<void> | void; dispose?: () => Promise<void> | void } = instance as {
				[key: symbol]: (() => Promise<void> | void) | undefined;
				close?: () => Promise<void> | void;
				dispose?: () => Promise<void> | void;
			};
			const symbolAsyncDispose: symbol | undefined = (Symbol as { asyncDispose?: symbol }).asyncDispose;
			const symbolDispose: symbol | undefined = (Symbol as { dispose?: symbol }).dispose;

			if (symbolAsyncDispose && typeof disposable[symbolAsyncDispose] === "function") {
				callbacks.push(async () => await disposable[symbolAsyncDispose]?.());
			} else if (symbolDispose && typeof disposable[symbolDispose] === "function") {
				callbacks.push(() => disposable[symbolDispose]?.());
			} else if (typeof disposable.dispose === "function") {
				callbacks.push(() => disposable.dispose?.());
			} else if (typeof disposable.close === "function") {
				callbacks.push(() => disposable.close?.());
			}
		}

		if (callbacks.length === 0) {
			return undefined;
		}

		let isAlreadyDisposed: boolean = false;

		const disposerForToken = async (): Promise<void> => {
			if (isAlreadyDisposed) {
				return;
			}

			isAlreadyDisposed = true;
			const callbackErrors: Array<unknown> = [];

			for (const callback of callbacks) {
				try {
					await callback();
				} catch (error) {
					callbackErrors.push(error);
				}
			}

			if (callbackErrors.length > 0) {
				throw new BaseError("Provider disposer callbacks failed", {
					cause: this.TO_ERROR(callbackErrors[0]),
					code: "PROVIDER_DISPOSE_CALLBACK_FAILED",
					context: {
						errorCount: callbackErrors.length,
						errors: callbackErrors.map((error: unknown) => this.TO_ERROR(error).message),
						scopeId: disposerScope.id,
					},
					source: "DIContainer",
				});
			}
		};

		if (registrationOptions.shouldTrack ?? true) {
			const providerDisposers: Array<() => Promise<void>> = options.getProviderDisposersByToken(disposerScope, dependencyKeySymbol) ?? [];

			providerDisposers.push(disposerForToken);
			options.setProviderDisposersByToken(disposerScope, dependencyKeySymbol, providerDisposers);
			options.pushDisposer(disposerScope, disposerForToken);
		}

		return disposerForToken;
	}

	private async disposeCachedInstancesForTokenRecursivelyInternal<TScope extends { id: string }>(
		dependencyKeySymbol: symbol,
		scope: TScope,
		options: {
			deleteProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => void;
			getChildScopes: (scopeNode: TScope) => ReadonlyArray<TScope>;
			getProviderDisposersByToken: (scopeNode: TScope, dependencyKeySymbol: symbol) => Array<() => Promise<void>> | undefined;
			hasLocalProvider: (scopeNode: TScope, dependencyKeySymbol: symbol) => boolean;
			removeTrackedDisposer?: (scopeNode: TScope, disposer: () => Promise<void>) => void;
		},
		callbackErrors: Array<{
			error: Error;
			scopeId: string;
		}>,
	): Promise<void> {
		const providerDisposers: Array<() => Promise<void>> | undefined = options.getProviderDisposersByToken(scope, dependencyKeySymbol);

		if (providerDisposers && providerDisposers.length > 0) {
			options.deleteProviderDisposersByToken(scope, dependencyKeySymbol);

			for (const disposer of [...providerDisposers].reverse()) {
				options.removeTrackedDisposer?.(scope, disposer);

				try {
					await disposer();
				} catch (error) {
					callbackErrors.push({
						error: this.TO_ERROR(error),
						scopeId: scope.id,
					});
				}
			}
		}

		for (const childScope of options.getChildScopes(scope)) {
			if (options.hasLocalProvider(childScope, dependencyKeySymbol)) {
				continue;
			}

			await this.disposeCachedInstancesForTokenRecursivelyInternal(dependencyKeySymbol, childScope, options, callbackErrors);
		}
	}
}
