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

export function assertNever(never: never) {
	throw new Error('Expected never, got ' + never)
}
