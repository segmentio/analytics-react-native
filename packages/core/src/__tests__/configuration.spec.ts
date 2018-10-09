import Bridge from '../bridge'
import { configure } from '../configuration'

jest.mock('../bridge')

const config = () => configure(null as any, jest.fn())
const writeKey = 'test-write-key'

const defaultConfig = {
	flushAt: 20,

	debug: false,
	recordScreenViews: false,
	trackAppLifecycleEvents: false,
	trackAttributionData: false,

	android: {
		collectDeviceId: true,
		writeKey
	},
	ios: {
		trackAdvertising: false,
		trackDeepLinks: false,
		writeKey
	}
}

beforeEach(() => {
	;(Bridge.setup as jest.Mock).mockClear()
})

it('uses the default configuration', async () => {
	await config().setup(writeKey)

	expect(Bridge.setup).toHaveBeenLastCalledWith(defaultConfig)
})

it('produces a valid configuration', async () => {
	await config()
		.recordScreenViews()
		.trackAppLifecycleEvents()
		.trackAttributionData()
		.flushAt(42)
		.debug()
		.ios()
		.trackAdvertising()
		.trackDeepLinks()
		.android()
		.disableDeviceId()
		.setup(writeKey)

	expect(Bridge.setup).toHaveBeenLastCalledWith({
		flushAt: 42,

		debug: true,
		recordScreenViews: true,
		trackAppLifecycleEvents: true,
		trackAttributionData: true,

		android: {
			collectDeviceId: false,
			writeKey
		},
		ios: {
			trackAdvertising: true,
			trackDeepLinks: true,
			writeKey
		}
	})
})

it('supports per-platform write keys', async () => {
	const android = 'write key android'
	const ios = 'write key ios'

	await config().setup({ ios, android })

	expect(Bridge.setup).toHaveBeenLastCalledWith({
		...defaultConfig,
		android: {
			...defaultConfig.android,
			writeKey: android
		},
		ios: {
			...defaultConfig.ios,
			writeKey: ios
		}
	})
})

it('waits for integrations to register', async () => {
	const stub = jest.fn(async t =>
		setTimeout(() => {
			expect(Bridge.setup).not.toHaveBeenCalled()
			t()
		}, 500)
	)

	await config()
		.using(() => ({ then: stub }))
		.setup(writeKey)

	expect(stub).toHaveBeenCalled()
	expect(Bridge.setup).toHaveBeenCalled()
})

it('supports disabled integrations', async () => {
	await config()
		.using({ disabled: true })
		.setup(writeKey)

	expect(Bridge.setup).toHaveBeenCalled()
})
