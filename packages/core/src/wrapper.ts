import bridge, { Bridge } from './bridge'

export interface NativeDelegate {
	ready: boolean
}
export type ErrorHandler = (err: Error) => void

export class NativeWrapper<T extends NativeDelegate> {
	constructor(
		private readonly delegate: T,
		private readonly handler: ErrorHandler,
		private readonly queue: (() => void)[] = []
	) {}

	/**
	 * Run a bridge method.
	 * It first waits for `.setup()` or `.useNativeConfiguration()` to be
	 * called and redirects exceptions to `handler`.
	 * @param method Name of the method to call.
	 * @param caller Function with the bridge function as first argument.
	 */
	public async run<M extends keyof Bridge>(
		method: M,
		caller: (fn: Bridge[M]) => Promise<void>
	) {
		const { delegate, handler, queue } = this

		if (delegate.ready) {
			await run()
		} else {
			queue.push(run)
		}

		async function run() {
			try {
				await caller(bridge[method])
			} catch (err) {
				return handler(err)
			}
		}
	}

	/** Waits for `.setup()` or `.useNativeConfiguration()` to be called. */
	public async wait() {
		if (this.delegate.ready) {
			return
		}

		return new Promise(resolve => this.queue.push(resolve))
	}

	public ready() {
		const { delegate, queue } = this

		delegate.ready = true

		while (queue.length) {
			queue.shift()!()
		}
	}
}
