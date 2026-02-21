export class DisposalManager {
	private activeAsyncResolutions: number;

	private readonly DISPOSAL_WAITERS: Array<() => void>;

	private readonly DISPOSE_INTERNAL: () => Promise<void>;

	private readonly GET_DISPOSE_PROMISE: () => Promise<void> | undefined;

	private readonly IS_DISPOSED: () => boolean;

	private readonly IS_DISPOSING: () => boolean;

	private readonly SET_DISPOSE_PROMISE: (disposePromise?: Promise<void>) => void;

	private readonly SET_IS_DISPOSING: (value: boolean) => void;

	constructor(options: { disposeInternal: () => Promise<void>; getDisposePromise: () => Promise<void> | undefined; isDisposed: () => boolean; isDisposing: () => boolean; setDisposePromise: (disposePromise?: Promise<void>) => void; setIsDisposing: (isDisposing: boolean) => void }) {
		this.DISPOSE_INTERNAL = options.disposeInternal;
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
		while (this.activeAsyncResolutions > 0) {
			await new Promise<void>((resolve: () => void) => {
				this.DISPOSAL_WAITERS.push(resolve);
			});
		}
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
}
