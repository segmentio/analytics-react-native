import { configure } from '../configuration'

const writeKey = 'test-write-key'

function withIntegrity<T extends {}>(config: T): T & { json: string } {
	const json = JSON.stringify(config)

	return {
		...(config as any),
		json
	}
}

it('uses the default configuration', async () => {
	expect(await configure(writeKey, {})).toEqual(
		withIntegrity({
			debug: false,
			defaultProjectSettings: {},
			flushAt: 20,
			recordScreenViews: false,
			trackAppLifecycleEvents: false,
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
	)
})

it('produces a valid configuration', async () => {
	const config = await configure(writeKey, {
		debug: true,
		defaultProjectSettings: {
			integrations: {
				Adjust: {
					appToken: '13213'
				}
			}
		},
		flushAt: 42,
		recordScreenViews: true,
		trackAppLifecycleEvents: true,

		android: {
			collectDeviceId: false,
			flushInterval: 72
		},
		ios: {
			trackAdvertising: false,
			trackDeepLinks: true
		}
	})

	expect(config).toEqual(
		withIntegrity({
			debug: true,
			defaultProjectSettings: {
				integrations: {
					Adjust: {
						appToken: '13213'
					}
				}
			},
			flushAt: 42,
			recordScreenViews: true,
			trackAppLifecycleEvents: true,
			writeKey,

			android: {
				collectDeviceId: false,
				flushInterval: 72
			},
			ios: {
				trackAdvertising: false,
				trackDeepLinks: true
			}
		})
	)
})

it('waits for integrations to register', async () => {
	const stub: any = jest.fn(t => setTimeout(t, 500))

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
