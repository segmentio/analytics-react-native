export const toggle = <T, K extends string, O extends { [P in K]: T }>(
	obj: O,
	key: K,
	defaultValue?: T
) =>
	function<S>(this: S, value?: T) {
		if (typeof defaultValue !== 'undefined') {
			obj[key] = defaultValue
		} else if (typeof value !== 'undefined') {
			obj[key] = value
		}

		return this
	} as T extends O[K] ? <S>(this: S) => S : <S>(this: S, a: O[K]) => S

export interface NativeDelegate {
	ready: boolean
}
export type ErrorHandler = (err: Error) => void
export const nativeWrapper = <T extends NativeDelegate>(
	delegate: T,
	handler: ErrorHandler,
	queue: Array<() => void> = []
) => ({
	call: <F extends () => void>(fn: F) => {
		async function run() {
			try {
				await fn()
			} catch (err) {
				return handler(err)
			}
		}

		if (delegate.ready) {
			run()
		} else {
			queue.push(run)
		}

		return delegate
	},
	ready() {
		delegate.ready = true

		while (queue.length) {
			queue.shift()!()
		}
	}
})
