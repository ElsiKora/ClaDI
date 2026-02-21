import { BaseError } from "@infrastructure/class/base/error.class";

export class DisposalManager {
	private activeAsyncResolutions: number;

	private readonly DISPOSAL_WAITERS: Array<() => void>;

	private readonly DISPOSE_INTERNAL: () => Promise<void>;

	private readonly GET_ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS: () => number | undefined;

	private readonly GET_DISPOSE_PROMISE: () => Promise<void> | undefined;

	private readonly IS_DISPOSED: () => boolean;

	private readonly IS_DISPOSING: () => boolean;

	private readonly SET_DISPOSE_PROMISE: (disposePromise?: Promise<void>) => void;

	private readonly SET_IS_DISPOSING: (value: boolean) => void;

	constructor(options: { disposeInternal: () => Promise<void>; getAsyncResolutionDrainTimeoutMs: () => number | undefined; getDisposePromise: () => Promise<void> | undefined; isDisposed: () => boolean; isDisposing: () => boolean; setDisposePromise: (disposePromise?: Promise<void>) => void; setIsDisposing: (isDisposing: boolean) => void }) {
		this.DISPOSE_INTERNAL = options.disposeInternal;
		this.GET_ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS = options.getAsyncResolutionDrainTimeoutMs;
		this.GET_DISPOSE_PROMISE = options.getDisposePromise;
		this.IS_DISPOSED = options.isDisposed;
		this.IS_DISPOSING = options.isDisposing;
		this.SET_DISPOSE_PROMISE = options.setDisposePromise;
		this.SET_IS_DISPOSING = options.setIsDisposing;
		this.activeAsyncResolutions = 0;
		this.DISPOSAL_WAITERS = [];
	}

	public async dispose(): Promise<void> {
		if (this.IS_DISPOSED()) {
			return;
		}

		if (this.IS_DISPOSING()) {
			await this.GET_DISPOSE_PROMISE();

			return;
		}

		this.SET_IS_DISPOSING(true);
		const disposePromise: Promise<void> = this.DISPOSE_INTERNAL();
		this.SET_DISPOSE_PROMISE(disposePromise);

		await disposePromise;
	}

	public onAsyncResolutionEnd(): void {
		this.activeAsyncResolutions = Math.max(0, this.activeAsyncResolutions - 1);
		this.releaseDisposalWaitersIfIdle();
	}

	public onAsyncResolutionStart(): void {
		this.activeAsyncResolutions += 1;
	}

	public async waitForInFlightAsyncResolutions(): Promise<void> {
		const asyncResolutionDrainTimeoutMs: number | undefined = this.GET_ASYNC_RESOLUTION_DRAIN_TIMEOUT_MS();
		const hasTimeout: boolean = typeof asyncResolutionDrainTimeoutMs === "number" && Number.isFinite(asyncResolutionDrainTimeoutMs) && asyncResolutionDrainTimeoutMs >= 0;
		const normalizedTimeoutMs: number | undefined = hasTimeout ? asyncResolutionDrainTimeoutMs : undefined;
		const deadlineAtMs: number | undefined = normalizedTimeoutMs === undefined ? undefined : Date.now() + normalizedTimeoutMs;

		while (this.activeAsyncResolutions > 0) {
			await this.waitForIdleSignal(deadlineAtMs, normalizedTimeoutMs);
		}
	}

	private createAsyncResolutionDrainTimeoutError(asyncResolutionDrainTimeoutMs: number): BaseError {
		return new BaseError("Timed out waiting for in-flight async resolutions during disposal", {
			code: "SCOPE_DISPOSE_ASYNC_DRAIN_TIMEOUT",
			context: {
				activeAsyncResolutions: this.activeAsyncResolutions,
				timeoutMs: asyncResolutionDrainTimeoutMs,
			},
			source: "DIContainer",
		});
	}

	private releaseDisposalWaitersIfIdle(): void {
		if (this.activeAsyncResolutions > 0 || this.DISPOSAL_WAITERS.length === 0) {
			return;
		}

		const pendingWaiters: Array<() => void> = [...this.DISPOSAL_WAITERS];
		this.DISPOSAL_WAITERS.length = 0;

		for (const waiter of pendingWaiters) {
			waiter();
		}
	}

	private async waitForIdleSignal(deadlineAtMs?: number, configuredTimeoutMs?: number): Promise<void> {
		if (deadlineAtMs === undefined) {
			await new Promise<void>((resolve: () => void) => {
				this.DISPOSAL_WAITERS.push(resolve);
			});

			return;
		}

		const remainingTimeoutMs: number = deadlineAtMs - Date.now();

		if (remainingTimeoutMs <= 0) {
			throw this.createAsyncResolutionDrainTimeoutError(configuredTimeoutMs ?? 0);
		}

		await new Promise<void>((resolve: () => void, reject: (reason?: unknown) => void) => {
			const waiter = (): void => {
				clearTimeout(timeoutHandle);
				resolve();
			};

			const timeoutHandle: ReturnType<typeof setTimeout> = setTimeout(() => {
				const waiterIndex: number = this.DISPOSAL_WAITERS.indexOf(waiter);

				if (waiterIndex !== -1) {
					this.DISPOSAL_WAITERS.splice(waiterIndex, 1);
				}

				reject(this.createAsyncResolutionDrainTimeoutError(configuredTimeoutMs ?? remainingTimeoutMs));
			}, remainingTimeoutMs);
			this.DISPOSAL_WAITERS.push(waiter);
		});
	}
}
