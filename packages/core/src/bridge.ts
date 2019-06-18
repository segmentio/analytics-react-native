import { NativeModules } from 'react-native'

export interface Configuration {
	writeKey: string
	recordScreenViews: boolean
	trackAppLifecycleEvents: boolean
	trackAttributionData: boolean
	debug: boolean
	flushAt: number
	json: string

	android: {
		flushInterval?: number
		collectDeviceId: boolean
	}
	ios: {
		trackAdvertising: boolean
		trackDeepLinks: boolean
	}
}

export type JsonValue = boolean | number | string | null | JsonList | JsonMap
export interface JsonMap {
	[key: string]: JsonValue
	[index: number]: JsonValue
}
export interface JsonList extends Array<JsonValue> {}

export interface Integrations {
	[key: string]: boolean | JsonMap
}

export interface Options {
	integrations?: Integrations
}

export interface Bridge {
	setup(configuration: Configuration): Promise<void>
	track(
		event: string,
		properties: JsonMap,
		options: Options,
		context: JsonMap
	): Promise<void>
	identify(
		user: string,
		traits: JsonMap,
		options: Options,
		context: JsonMap
	): Promise<void>
	screen(
		name: string,
		properties: JsonMap,
		options: Options,
		context: JsonMap
	): Promise<void>
	group(
		groupId: string,
		traits: JsonMap,
		options: Options,
		context: JsonMap
	): Promise<void>
	alias(alias: string, options: Options, context: JsonMap): Promise<void>
	reset(): Promise<void>
	flush(): Promise<void>
	enable(): Promise<void>
	disable(): Promise<void>
	getAnonymousId(): Promise<string>
}

const bridge: Bridge = NativeModules.RNAnalytics

if (!bridge) {
	throw new Error('Failed to load Analytics native module.')
}

export default bridge
