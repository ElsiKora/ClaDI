import { BaseError } from "@infrastructure/class/base/error.class";

export class DisposalCoordinator<TScope extends { dispose: () => Promise<void> }> {
	private readonly CLEAR_CHILD_SCOPES: () => void;

	private readonly CLEAR_DISPOSERS: () => void;

	private readonly CLEAR_DISPOSERS_BY_TOKEN: () => void;

	private readonly CLEAR_PROVIDERS: () => void;

	private readonly CLEAR_ROOT_SINGLETON_CACHE_IF_ROOT_SCOPE: () => void;

	private readonly CLEAR_SCOPED_CACHE: () => void;

	private readonly DETACH_FROM_PARENT: () => void;

	private readonly GET_CHILD_SCOPES_IN_REVERSE: () => ReadonlyArray<TScope>;

	private readonly GET_DISPOSERS_IN_REVERSE: () => ReadonlyArray<() => Promise<void>>;

	private readonly GET_SCOPE_ID: () => string;

	private readonly RELEASE_SINGLETON_CACHE_FOR_SCOPE_PROVIDERS: () => void;

	private readonly TO_ERROR: (error: unknown) => Error;

	private readonly WAIT_FOR_IN_FLIGHT_ASYNC_RESOLUTIONS: () => Promise<void>;

	constructor(options: {
		clearChildScopes: () => void;
		clearDisposers: () => void;
		clearDisposersByToken: () => void;
		clearProviders: () => void;
		clearRootSingletonCacheIfRootScope: () => void;
		clearScopedCache: () => void;
		detachFromParent: () => void;
		getChildScopesInReverse: () => ReadonlyArray<TScope>;
		getDisposersInReverse: () => ReadonlyArray<() => Promise<void>>;
		getScopeId: () => string;
		releaseSingletonCacheForScopeProviders: () => void;
		toError: (error: unknown) => Error;
		waitForInFlightAsyncResolutions: () => Promise<void>;
	}) {
		this.CLEAR_CHILD_SCOPES = options.clearChildScopes;
		this.CLEAR_DISPOSERS = options.clearDisposers;
		this.CLEAR_DISPOSERS_BY_TOKEN = options.clearDisposersByToken;
		this.CLEAR_PROVIDERS = options.clearProviders;
		this.CLEAR_ROOT_SINGLETON_CACHE_IF_ROOT_SCOPE = options.clearRootSingletonCacheIfRootScope;
		this.CLEAR_SCOPED_CACHE = options.clearScopedCache;
		this.DETACH_FROM_PARENT = options.detachFromParent;
		this.GET_CHILD_SCOPES_IN_REVERSE = options.getChildScopesInReverse;
		this.GET_DISPOSERS_IN_REVERSE = options.getDisposersInReverse;
		this.GET_SCOPE_ID = options.getScopeId;
		this.RELEASE_SINGLETON_CACHE_FOR_SCOPE_PROVIDERS = options.releaseSingletonCacheForScopeProviders;
		this.TO_ERROR = options.toError;
		this.WAIT_FOR_IN_FLIGHT_ASYNC_RESOLUTIONS = options.waitForInFlightAsyncResolutions;
	}

	public async disposeInternal(): Promise<void> {
		const disposalErrors: Array<unknown> = [];

		await this.WAIT_FOR_IN_FLIGHT_ASYNC_RESOLUTIONS();
		const childScopes: ReadonlyArray<TScope> = this.GET_CHILD_SCOPES_IN_REVERSE();

		for (const childScope of childScopes) {
			try {
				await childScope.dispose();
			} catch (error) {
				disposalErrors.push(error);
			}
		}

		const disposers: ReadonlyArray<() => Promise<void>> = this.GET_DISPOSERS_IN_REVERSE();

		for (const disposer of disposers) {
			try {
				await disposer();
			} catch (error) {
				disposalErrors.push(error);
			}
		}

		this.RELEASE_SINGLETON_CACHE_FOR_SCOPE_PROVIDERS();
		this.CLEAR_DISPOSERS();
		this.CLEAR_DISPOSERS_BY_TOKEN();
		this.CLEAR_SCOPED_CACHE();
		this.CLEAR_PROVIDERS();
		this.CLEAR_CHILD_SCOPES();
		this.CLEAR_ROOT_SINGLETON_CACHE_IF_ROOT_SCOPE();
		this.DETACH_FROM_PARENT();

		if (disposalErrors.length > 0) {
			const serializedErrors: Array<{
				code?: string;
				context?: Record<string, unknown>;
				message: string;
				name: string;
				source?: string;
				stack?: string;
			}> = disposalErrors.map((error: unknown) => {
				const normalizedError: Error = this.TO_ERROR(error);

				const serializedError: {
					code?: string;
					context?: Record<string, unknown>;
					message: string;
					name: string;
					source?: string;
					stack?: string;
				} = {
					message: normalizedError.message,
					name: normalizedError.name,
					stack: normalizedError.stack,
				};

				if (normalizedError instanceof BaseError) {
					serializedError.code = normalizedError.code;
					serializedError.context = normalizedError.context;
					serializedError.source = normalizedError.source;
				}

				return serializedError;
			});

			throw new BaseError("Scope disposed with cleanup errors", {
				cause: this.TO_ERROR(disposalErrors[0]),
				code: "SCOPE_DISPOSE_CLEANUP_FAILED",
				context: {
					errorCount: disposalErrors.length,
					errors: serializedErrors,
					scopeId: this.GET_SCOPE_ID(),
				},
				source: "DIContainer",
			});
		}
	}
}
