import { NativeModules } from 'react-native'

import bridge = NativeModules.RNAnalytics

export default bridge
export type JsonMap = NativeModules.RNAnalytics.JsonMap
export type Bridge = typeof bridge
export interface NativeDelegate {
	ready: boolean
}
export type ErrorHandler = (err: Error) => void

export class NativeWrapper<T extends NativeDelegate> {
	constructor(
		private readonly delegate: T,
		private readonly handler: ErrorHandler,
		private readonly queue: Array<() => void> = []
	) {}

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

	public ready() {
		const { delegate, queue } = this

		delegate.ready = true

		while (queue.length) {
			queue.shift()!()
		}
	}
}
