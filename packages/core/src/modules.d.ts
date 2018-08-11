declare module 'react-native' {
    export namespace NativeModules.RNAnalytics {
        export interface Configuration {
            recordScreenViews: boolean
            trackAppLifecycleEvents: boolean
            trackAttributionData: boolean
            debug: boolean
            flushAt: number

            ios: {
                recordBluetooth: boolean
                trackAdvertising: boolean
                trackDeepLinks: boolean
                writeKey: string
            }
            android: {
                writeKey: string
                collectDeviceId: boolean
            }
        }

        export function setup(configuration: Configuration): Promise<void>
        export function track(event: string, properties: any): Promise<void>
        export function identify(user: string, traits: any): Promise<void>
        export function screen(name: string, properties: any): Promise<void>
        export function group(groupId: string, traits: any): Promise<void>
        export function alias(alias: string): Promise<void>
        export function reset(): Promise<void>
        export function flush(): Promise<void>
        export function enable(): Promise<void>
        export function disable(): Promise<void>
    }
}
