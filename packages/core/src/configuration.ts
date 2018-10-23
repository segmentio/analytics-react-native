import { Analytics } from './analytics'
import Bridge from './bridge'

const defaults = {
	android: ({
		collectDeviceId = true,
		flushInterval
	}: Partial<Bridge.Configuration['android']>) => ({
		collectDeviceId,
		flushInterval
	}),
	ios: ({
		trackAdvertising = false,
		trackDeepLinks = false
	}: Partial<Bridge.Configuration['ios']>) => ({
		trackAdvertising,
		trackDeepLinks
	})
}

export const configure = async (
	writeKey: string,
	{
		flushAt = 20,
		debug = false,
		recordScreenViews = false,
		trackAppLifecycleEvents = false,
		trackAttributionData = false,
		using = [],

		ios = {},
		android = {}
	}: Analytics.Configuration
): Promise<Bridge.Configuration> => {
	await Promise.all(
		using.map(
			async integration =>
				typeof integration === 'function' ? await integration() : null
		)
	)

	return {
		debug,
		flushAt,
		recordScreenViews,
		trackAppLifecycleEvents,
		trackAttributionData,
		writeKey,

		android: defaults.android(android),
		ios: defaults.ios(ios)
	}
}
