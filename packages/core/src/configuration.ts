import { Analytics } from './analytics'
import Bridge from './bridge'
import { toggle } from './utils'

export function configure(
	analytics: Analytics.Client,
	done: () => void
): Analytics.ChainedConfiguration.Configuration {
	const promises: Array<Promise<void | null>> = []
	const config: Bridge.Configuration = {
		flushAt: 20,

		debug: false,
		recordScreenViews: false,
		trackAppLifecycleEvents: false,
		trackAttributionData: false,

		android: {
			collectDeviceId: true,
			writeKey: ''
		},
		ios: {
			trackAdvertising: false,
			trackDeepLinks: false,
			writeKey: ''
		}
	}

	const baseMatcher = {
		android: () => ({
			...baseMatcher,
			disableDeviceId: toggle(config.android, 'collectDeviceId', false),
			flushInterval(interval: number) {
				config.android.flushInterval = interval

				return this
			}
		}),
		ios: () => ({
			...baseMatcher,
			trackAdvertising: toggle(config.ios, 'trackAdvertising', true),
			trackDeepLinks: toggle(config.ios, 'trackDeepLinks', true)
		}),
		setup: async (writeKey: Analytics.WriteKey) => {
			if (typeof writeKey === 'string') {
				config.ios.writeKey = writeKey
				config.android.writeKey = writeKey
			} else {
				config.ios.writeKey = writeKey.ios
				config.android.writeKey = writeKey.android
			}

			await Promise.all(promises)
			await Bridge.setup(config)
			done()

			return analytics
		}
	}

	return {
		...baseMatcher,
		debug: toggle(config, 'debug', true),
		flushAt: toggle(config, 'flushAt'),
		recordScreenViews: toggle(config, 'recordScreenViews', true),
		trackAppLifecycleEvents: toggle(config, 'trackAppLifecycleEvents', true),
		trackAttributionData: toggle(config, 'trackAttributionData', true),
		using(...integrations: Analytics.Integration[]) {
			promises.push(
				...integrations.map(
					async integration =>
						typeof integration === 'function' ? integration() : null
				)
			)

			return this
		}
	}
}
