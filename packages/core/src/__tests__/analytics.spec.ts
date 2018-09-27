import mockConsole, { RestoreConsole } from 'jest-mock-console'

import { Analytics } from '../analytics'
import Bridge from '../bridge'

jest.mock('../bridge')

const getBridgeStub = <K extends keyof typeof Bridge>(
	name: K
): jest.Mock<(typeof Bridge)[K]> => (Bridge as any)[name]
let analytics: Analytics.Client = null!
let restoreConsole: RestoreConsole = null!

beforeEach(async () => {
	restoreConsole = mockConsole()
	analytics = new Analytics.Client()
	Object.keys(Bridge).forEach(key => getBridgeStub(key as any).mockClear())

	await analytics.configure().setup('write key')
})

afterEach(() => {
	restoreConsole()
})

it('is ready', () => expect(analytics.ready).toBe(true))

it('catches bridge errors', async () => {
	const error = new Error('test-error')
	const onError = jest.fn()

	getBridgeStub('track').mockImplementationOnce(() => Promise.reject(error))
	analytics.catch(onError)
	analytics.track('test')

	expect(onError).not.toHaveBeenCalled()
	await new Promise(resolve => setImmediate(resolve))
	expect(onError).toHaveBeenCalledWith(error)
})

it('logs uncaught bridge errors', async () => {
	const error = new Error('test-error')

	getBridgeStub('track').mockImplementationOnce(
		() => new Promise((_, reject) => setImmediate(() => reject(error)))
	)
	analytics.track('test')

	expect(console.error).not.toHaveBeenCalled()
	await new Promise(resolve => setImmediate(resolve))
	expect(console.error).toHaveBeenCalledWith('Uncaught Analytics error', error)
})

it('waits for .setup()', async () => {
	const client = new Analytics.Client()

	client.track('test 1')
	client.track('test 2')

	expect(Bridge.track).not.toHaveBeenCalled()
	await client.configure().setup('key')

	expect(Bridge.track).toHaveBeenNthCalledWith(1, 'test 1', {})
	expect(Bridge.track).toHaveBeenNthCalledWith(2, 'test 2', {})
})

const ctx = {}

it('does .track()', () =>
	testCall('track')('Added to cart', { productId: 'azertyuiop' }, ctx))

it('does .screen()', () =>
	testCall('screen')('Shopping cart', { from: 'Product page' }, ctx))

it('does .identify()', () =>
	testCall('identify')('sloth', { eats: 'leaves' }, ctx))

it('does .group()', () => testCall('group')('bots', { humans: false }, ctx))

it('does .alias()', () => testCall('alias')('new alias', ctx))

it('does .reset()', testCall('reset'))
it('does .flush()', testCall('flush'))
it('does .enable()', testCall('enable'))
it('does .disable()', testCall('disable'))

function testCall<K extends keyof typeof Bridge>(name: K): (typeof Bridge)[K] {
	return ((...args: any[]) => {
		analytics.constructor.prototype[name].call(analytics, ...args)
		expect(Bridge[name]).toHaveBeenNthCalledWith(1, ...args)
	}) as any
}
