import Bridge from './bridge'
import {toggle} from './utils'
import {Analytics} from './analytics'

export function configure(analytics: Analytics.Client, done: () => void): Analytics.ChainedConfiguration.Configuration {
    const promises: Array<Promise<void | null>> = []
    const config = {
        flushAt: 20,

        recordScreenViews: false,
        trackAppLifecycleEvents: false,
        trackAttributionData: false,
        debug: false,

        ios: {
            recordBluetooth: false,
            trackAdvertising: false,
            trackDeepLinks: false,
            writeKey: ''
        },
        android: {
            writeKey: '',
            collectDeviceId: true
        }
    }

    const baseMatcher = {
        setup: async (writeKey: Analytics.WriteKey) => {
            if(typeof writeKey === 'string') {
                config.ios.writeKey = writeKey
                config.android.writeKey = writeKey
            }
            else {
                config.ios.writeKey = writeKey.ios
                config.android.writeKey = writeKey.android
            }

            await Promise.all(promises)
            await Bridge.setup(config)
            done()

            return analytics
        },
        ios: () => ({
            ...baseMatcher,
            recordBluetooth: toggle(config.ios, 'recordBluetooth', true),
            trackAdvertising: toggle(config.ios, 'trackAdvertising', true),
            trackDeepLinks: toggle(config.ios, 'trackDeepLinks', true)
        }),
        android: () => ({
            ...baseMatcher,
            disableDeviceId: toggle(config.android, 'collectDeviceId', false)
        })
    } 

    return {
        ...baseMatcher,
        recordScreenViews: toggle(config, 'recordScreenViews', true),
        trackAppLifecycleEvents: toggle(config, 'trackAppLifecycleEvents', true),
        trackAttributionData: toggle(config, 'trackAttributionData', true),
        debug: toggle(config, 'debug', true),
        flushAt: toggle(config, 'flushAt'),
        using(...integrations: Analytics.Integration[]) {
            promises.push(
                ...integrations.map(async integration =>
                    typeof integration === 'function'
                        ? integration()
                        : null
                )
            )

            return this
        }
    }
}
