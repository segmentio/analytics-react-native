import {configure} from '../configuration'
import Bridge from '../bridge'

jest.mock('../bridge')

const config = () => configure(null as any, jest.fn())
const writeKey = 'test-write-key'

const defaultConfig = {
    flushAt: 20,

    recordScreenViews: false,
    trackAppLifecycleEvents: false,
    trackAttributionData: false,
    debug: false,

    ios: {
        writeKey,
        recordBluetooth: false,
        trackAdvertising: false,
        trackDeepLinks: false
    },
    android: {
        writeKey,
        collectDeviceId: true
    }
}

beforeEach(() => {
    (Bridge.setup as jest.Mock).mockClear()
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
            .recordBluetooth()
            .trackAdvertising()
            .trackDeepLinks()
        .android()
            .disableDeviceId()
        .setup(writeKey)

    expect(Bridge.setup).toHaveBeenLastCalledWith({
        flushAt: 42,

        recordScreenViews: true,
        trackAppLifecycleEvents: true,
        trackAttributionData: true,
        debug: true,

        ios: {
            writeKey,
            recordBluetooth: true,
            trackAdvertising: true,
            trackDeepLinks: true
        },
        android: {
            writeKey,
            collectDeviceId: false
        }
    })
})

it('supports per-platform write keys', async () => {
    const android = 'write key android'
    const ios = 'write key ios'

    await config().setup({ios, android})

    expect(Bridge.setup).toHaveBeenLastCalledWith({
        ...defaultConfig,
        ios: {
            ...defaultConfig.ios,
            writeKey: ios
        },
        android: {
            ...defaultConfig.android,
            writeKey: android
        }
    })
})

it('waits for integrations to register', async () => {
    const stub = jest.fn(async t =>
        setTimeout(
            () => {
                expect(Bridge.setup).not.toHaveBeenCalled()
                t()
            },
            500
        )
    )

    await config()
        .using(() => ({then: stub}))
        .setup(writeKey)
    
    expect(stub).toHaveBeenCalled()
    expect(Bridge.setup).toHaveBeenCalled()
})

it('supports disabled integrations', async () => {
    await config()
        .using({disabled: true})
        .setup(writeKey)

    expect(Bridge.setup).toHaveBeenCalled()
})
