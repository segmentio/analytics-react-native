import { configure } from '../configuration'

const writeKey = 'test-write-key'

it('uses the default configuration', async () => {
	expect(await configure(writeKey, {})).toEqual({
		debug: false,
		flushAt: 20,
		recordScreenViews: false,
		trackAppLifecycleEvents: false,
		trackAttributionData: false,
		writeKey,

		android: {
			collectDeviceId: true,
			flushInterval: undefined
		},
		ios: {
			trackAdvertising: false,
			trackDeepLinks: false
		}
	})
})

it('produces a valid configuration', async () => {
	const config = await configure(writeKey, {
		debug: true,
		flushAt: 42,
		recordScreenViews: true,
		trackAppLifecycleEvents: true,
		trackAttributionData: true,

		android: {
			collectDeviceId: false,
			flushInterval: 72
		},
		ios: {
			trackAdvertising: true,
			trackDeepLinks: true
		}
	})

	expect(config).toEqual({
		debug: true,
		flushAt: 42,
		recordScreenViews: true,
		trackAppLifecycleEvents: true,
		trackAttributionData: true,
		writeKey,

		android: {
			collectDeviceId: false,
			flushInterval: 72
		},
		ios: {
			trackAdvertising: true,
			trackDeepLinks: true
		}
	})
})

it('waits for integrations to register', async () => {
	const stub = jest.fn(t => setTimeout(t, 500))

	await configure(writeKey, {
		using: [() => ({ then: stub })]
	})

	expect(stub).toHaveBeenCalled()
})

it('supports disabled integrations', async () => {
	await configure(writeKey, {
		using: [{ disabled: true }]
	})
})
