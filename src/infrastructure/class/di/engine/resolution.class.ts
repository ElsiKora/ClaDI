import type { Token } from "@domain/type";

import { toError } from "@infrastructure/utility/to-error.utility";

export class ResolutionEngine {
	private readonly ASSERT_KEY: <T>(dependencyKey: Token<T>) => symbol;

	private readonly ENSURE_ACTIVE: () => void;

	private readonly ENSURE_NOT_DISPOSING: () => void;

	private readonly GET_SCOPE_ID: () => string;

	private readonly NOTIFY_ON_ERROR: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, error: Error) => void;

	private readonly NOTIFY_ON_START: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string) => void;

	private readonly NOTIFY_ON_SUCCESS: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, result?: unknown) => void;

	private readonly ON_ASYNC_RESOLUTION_END: () => void;

	private readonly ON_ASYNC_RESOLUTION_START: () => void;

	private readonly RESOLVE_ALL_ASYNC_INTERNAL: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Promise<Array<unknown>>;

	private readonly RESOLVE_ALL_SYNC_INTERNAL: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Array<unknown>;

	private readonly RESOLVE_ASYNC_INTERNAL: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Promise<unknown>;

	private readonly RESOLVE_SYNC_INTERNAL: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => unknown;

	constructor(options: {
		assertKey: <T>(dependencyKey: Token<T>) => symbol;
		ensureActive: () => void;
		ensureNotDisposing: () => void;
		getScopeId: () => string;
		notifyOnError: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, error: Error) => void;
		notifyOnStart: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string) => void;
		notifyOnSuccess: (tokenSymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, result?: unknown) => void;
		onAsyncResolutionEnd: () => void;
		onAsyncResolutionStart: () => void;
		resolveAllAsyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Promise<Array<unknown>>;
		resolveAllSyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Array<unknown>;
		resolveAsyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => Promise<unknown>;
		resolveSyncInternal: (tokenSymbol: symbol, path: Array<symbol>, visitedTokens: ReadonlySet<symbol>) => unknown;
	}) {
		this.ASSERT_KEY = options.assertKey;
		this.ENSURE_ACTIVE = options.ensureActive;
		this.ENSURE_NOT_DISPOSING = options.ensureNotDisposing;
		this.GET_SCOPE_ID = options.getScopeId;
		this.NOTIFY_ON_ERROR = options.notifyOnError;
		this.NOTIFY_ON_START = options.notifyOnStart;
		this.NOTIFY_ON_SUCCESS = options.notifyOnSuccess;
		this.ON_ASYNC_RESOLUTION_END = options.onAsyncResolutionEnd;
		this.ON_ASYNC_RESOLUTION_START = options.onAsyncResolutionStart;
		this.RESOLVE_ALL_ASYNC_INTERNAL = options.resolveAllAsyncInternal;
		this.RESOLVE_ALL_SYNC_INTERNAL = options.resolveAllSyncInternal;
		this.RESOLVE_ASYNC_INTERNAL = options.resolveAsyncInternal;
		this.RESOLVE_SYNC_INTERNAL = options.resolveSyncInternal;
	}

	public resolve<T>(dependencyKey: Token<T>): T {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, false, false, false, scopeId);

		try {
			const resolvedValue: T = this.RESOLVE_SYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>()) as T;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, false, false, false, scopeId, resolvedValue);

			return resolvedValue;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, false, false, false, scopeId, toError(error));

			throw error;
		}
	}

	public resolveAll<T>(dependencyKey: Token<T>): Array<T> {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, false, true, false, scopeId);

		try {
			const resolvedValues: Array<T> = this.RESOLVE_ALL_SYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>()) as Array<T>;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, false, true, false, scopeId, resolvedValues);

			return resolvedValues;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, false, true, false, scopeId, toError(error));

			throw error;
		}
	}

	public async resolveAllAsync<T>(dependencyKey: Token<T>): Promise<Array<T>> {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, true, true, false, scopeId);
		this.ON_ASYNC_RESOLUTION_START();

		try {
			const resolvedValues: Array<T> = (await this.RESOLVE_ALL_ASYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>())) as Array<T>;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, true, true, false, scopeId, resolvedValues);

			return resolvedValues;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, true, true, false, scopeId, toError(error));

			throw error;
		} finally {
			this.ON_ASYNC_RESOLUTION_END();
		}
	}

	public async resolveAsync<T>(dependencyKey: Token<T>): Promise<T> {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, true, false, false, scopeId);
		this.ON_ASYNC_RESOLUTION_START();

		try {
			const resolvedValue: T = (await this.RESOLVE_ASYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>())) as T;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, true, false, false, scopeId, resolvedValue);

			return resolvedValue;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, true, false, false, scopeId, toError(error));

			throw error;
		} finally {
			this.ON_ASYNC_RESOLUTION_END();
		}
	}

	public resolveOptional<T>(dependencyKey: Token<T>, hasRegistration: (dependencyKeySymbol: symbol) => boolean): T | undefined {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, false, false, true, scopeId);

		if (!hasRegistration(dependencyKeySymbol)) {
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, false, false, true, scopeId);

			return undefined;
		}

		try {
			const resolvedValue: T = this.RESOLVE_SYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>()) as T;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, false, false, true, scopeId, resolvedValue);

			return resolvedValue;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, false, false, true, scopeId, toError(error));

			throw error;
		}
	}

	public async resolveOptionalAsync<T>(dependencyKey: Token<T>, hasRegistration: (dependencyKeySymbol: symbol) => boolean): Promise<T | undefined> {
		this.ENSURE_NOT_DISPOSING();
		this.ENSURE_ACTIVE();
		const dependencyKeySymbol: symbol = this.ASSERT_KEY(dependencyKey);
		const scopeId: string = this.GET_SCOPE_ID();
		this.NOTIFY_ON_START(dependencyKeySymbol, true, false, true, scopeId);

		if (!hasRegistration(dependencyKeySymbol)) {
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, true, false, true, scopeId);

			return undefined;
		}

		this.ON_ASYNC_RESOLUTION_START();

		try {
			const resolvedValue: T = (await this.RESOLVE_ASYNC_INTERNAL(dependencyKeySymbol, [], new Set<symbol>())) as T;
			this.NOTIFY_ON_SUCCESS(dependencyKeySymbol, true, false, true, scopeId, resolvedValue);

			return resolvedValue;
		} catch (error) {
			this.NOTIFY_ON_ERROR(dependencyKeySymbol, true, false, true, scopeId, toError(error));

			throw error;
		} finally {
			this.ON_ASYNC_RESOLUTION_END();
		}
	}
}
