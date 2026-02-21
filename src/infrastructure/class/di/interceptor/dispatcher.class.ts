import type { ILogger, IResolveInterceptor } from "@domain/interface";

export class ResolveInterceptorDispatcher {
	private readonly LOGGER: ILogger;

	private readonly RESOLVE_INTERCEPTORS: ReadonlyArray<IResolveInterceptor>;

	private readonly STRINGIFY_KEY: (dependencyKeySymbol: symbol) => string;

	private readonly TO_ERROR: (error: unknown) => Error;

	constructor(options: { logger: ILogger; resolveInterceptors: ReadonlyArray<IResolveInterceptor>; stringifyKey: (dependencyKeySymbol: symbol) => string; toError: (error: unknown) => Error }) {
		this.LOGGER = options.logger;
		this.RESOLVE_INTERCEPTORS = options.resolveInterceptors;
		this.STRINGIFY_KEY = options.stringifyKey;
		this.TO_ERROR = options.toError;
	}

	public notifyOnError(dependencyKeySymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, error: Error): void {
		const providerKeyDescription: string = this.STRINGIFY_KEY(dependencyKeySymbol);

		for (const resolveInterceptor of this.RESOLVE_INTERCEPTORS) {
			try {
				resolveInterceptor.onError?.({
					error,
					isAsync,
					isOptional,
					isResolveAll,
					scopeId,
					tokenDescription: providerKeyDescription,
				});
			} catch (callbackError) {
				this.LOGGER.warn("Resolve interceptor onError callback failed", {
					context: {
						callbackError: this.TO_ERROR(callbackError).message,
						scopeId,
						token: providerKeyDescription,
					},
					source: "DIContainer",
				});
			}
		}
	}

	public notifyOnStart(dependencyKeySymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string): void {
		const providerKeyDescription: string = this.STRINGIFY_KEY(dependencyKeySymbol);

		for (const resolveInterceptor of this.RESOLVE_INTERCEPTORS) {
			try {
				resolveInterceptor.onStart?.({
					isAsync,
					isOptional,
					isResolveAll,
					scopeId,
					tokenDescription: providerKeyDescription,
				});
			} catch (callbackError) {
				this.LOGGER.warn("Resolve interceptor onStart callback failed", {
					context: {
						callbackError: this.TO_ERROR(callbackError).message,
						scopeId,
						token: providerKeyDescription,
					},
					source: "DIContainer",
				});
			}
		}
	}

	public notifyOnSuccess(dependencyKeySymbol: symbol, isAsync: boolean, isResolveAll: boolean, isOptional: boolean, scopeId: string, result?: unknown): void {
		const providerKeyDescription: string = this.STRINGIFY_KEY(dependencyKeySymbol);

		for (const resolveInterceptor of this.RESOLVE_INTERCEPTORS) {
			try {
				resolveInterceptor.onSuccess?.({
					isAsync,
					isOptional,
					isResolveAll,
					result,
					scopeId,
					tokenDescription: providerKeyDescription,
				});
			} catch (callbackError) {
				this.LOGGER.warn("Resolve interceptor onSuccess callback failed", {
					context: {
						callbackError: this.TO_ERROR(callbackError).message,
						scopeId,
						token: providerKeyDescription,
					},
					source: "DIContainer",
				});
			}
		}
	}
}
