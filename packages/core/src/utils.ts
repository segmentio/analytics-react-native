export function assertNever(never: never) {
	throw new Error('Expected never, got ' + never)
}
