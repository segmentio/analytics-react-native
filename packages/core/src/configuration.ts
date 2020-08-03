import { Analytics } from './analytics'
import { Configuration } from './bridge'

const defaults = {
	android: ({
		collectDeviceId = true,
		flushInterval
	}: Partial<Configuration['android']>) => ({
		collectDeviceId,
		flushInterval
	}),
	ios: ({
		trackAdvertising = true,
		trackDeepLinks = false
	}: Partial<Configuration['ios']>) => ({
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
		defaultProjectSettings = {},
		proxy = undefined,

		ios = {},
		android = {}
	}: Analytics.Configuration
): Promise<Configuration> => {
	await Promise.all(
		using.map(async integration =>
			typeof integration === 'function' ? await integration() : null
		)
	)

	const config = {
		debug,
		defaultProjectSettings,
		flushAt,
		recordScreenViews,
		trackAppLifecycleEvents,
		trackAttributionData,
		writeKey,
		proxy,

		android: defaults.android(android),
		ios: defaults.ios(ios)
	}
	const json = JSON.stringify(config)

	return {
		...config,
		json
	}
}
