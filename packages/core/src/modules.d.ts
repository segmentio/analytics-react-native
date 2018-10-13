declare module '*.json'
declare module 'react-native' {
	export namespace NativeModules.RNAnalytics {
		export interface Configuration {
			recordScreenViews: boolean
			trackAppLifecycleEvents: boolean
			trackAttributionData: boolean
			debug: boolean
			flushAt: number

			ios: {
				trackAdvertising: boolean
				trackDeepLinks: boolean
				writeKey: string
			}
			android: {
				flushInterval?: number
				writeKey: string
				collectDeviceId: boolean
			}
		}

		export type JsonValue =
			| boolean
			| number
			| string
			| null
			| JsonList
			| JsonMap
		export interface JsonMap {
			[key: string]: JsonValue
			[index: number]: JsonValue
		}
		export interface JsonList extends Array<JsonValue> {}

		export function setup(configuration: Configuration): Promise<void>
		export function track(
			event: string,
			properties: JsonMap,
			context: JsonMap
		): Promise<void>
		export function identify(
			user: string,
			traits: JsonMap,
			context: JsonMap
		): Promise<void>
		export function screen(
			name: string,
			properties: JsonMap,
			context: JsonMap
		): Promise<void>
		export function group(
			groupId: string,
			traits: JsonMap,
			context: JsonMap
		): Promise<void>
		export function alias(alias: string, context: JsonMap): Promise<void>
		export function reset(): Promise<void>
		export function flush(): Promise<void>
		export function enable(): Promise<void>
		export function disable(): Promise<void>
	}
}
