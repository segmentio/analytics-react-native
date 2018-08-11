import Bridge from './bridge'
import {configure} from './configuration'
import {ErrorHandler, nativeWrapper} from './utils'

export namespace Analytics {
    export class Client {
        /**
         * Whether the client is ready to send events to Segment.
         * 
         * This becomes `true` when `.setup()` succeeds.
         * All calls will be queued until it becomes `true`.
         */
        public readonly ready = false

        private readonly wrapper = nativeWrapper(this, err => this.handleError(err))
        private readonly handlers: ErrorHandler[] = []

        /**
         * Catch React-Native bridge errors
         * 
         * These errors are emitted when calling the native counterpart.
         */
        public catch(handler: ErrorHandler) {
            this.handlers.push(handler)

            return this
        }

        /**
         * Configure the Analytics module.
         * 
         * This method returns a fluent-style API to configure the SDK :
         * ```js
         * analytics
         *   .configure()
         *     .using(Mixpanel, GoogleAnalytics)
         *     .trackAppLifecycle()
         *     .ios()
         *       .trackDeepLinks()
         *   .setup("YOUR_WRITE_KEY")
         * ```
        */
        public configure() {
            return configure(this, this.wrapper.ready)
        }

        /**
         * Record the actions your users perform.
         * 
         * When a user performs an action in your app, you'll want to track that action for later analysis.
         * Use the event name to say what the user did, and properties to specify any interesting details of the action.
         * 
         * @param event The name of the event you're tracking.
         * We recommend using human-readable names like `Played a Song` or `Updated Status`.
         * @param properties A dictionary of properties for the event.
         * If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
         */
        public track(event: string, properties: JsonMap = {}) {
            return this.wrapper.call(() => Bridge.track(event, properties))
        }

        /**
         * Record the screens or views your users see.
         * 
         * When a user views a screen in your app, you'll want to record that here.
         * For some tools like Google Analytics and Flurry, screen views are treated specially, and are different
         * from "events" kind of like "page views" on the web. For services that don't treat "screen views" specially,
         * we map "screen" straight to "track" with the same parameters. For example, Mixpanel doesn't treat "screen views" any differently.
         * So a call to "screen" will be tracked as a normal event in Mixpanel, but get sent to Google Analytics and Flurry as a "screen".
         * 
         * @param name The title of the screen being viewed.
         * We recommend using human-readable names like 'Photo Feed' or 'Completed Purchase Screen'.
         * @param properties A dictionary of properties for the screen view event.
         * If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
         */
        public screen(name: string, properties: JsonMap = {}) {
            return this.wrapper.call(() => Bridge.screen(name, properties))
        }

        /**
         * Associate a user with their unique ID and record traits about them.
         * 
         * When you learn more about who your user is, you can record that information with identify.
         * 
         * @param userId database ID (or email address) for this user.
         * If you don't have a userId but want to record traits, you should pass nil.
         * For more information on how we generate the UUID and Apple's policies on IDs, see https://segment.io/libraries/ios#ids
         * @param traits A dictionary of traits you know about the user. Things like: email, name, plan, etc.
         */
        public identify(userId: string, traits: JsonMap = {}) {
            return this.wrapper.call(() => Bridge.identify(userId, traits))
        }

        /**
         * Associate a user with a group, organization, company, project, or w/e *you* call them.
         * 
         * When you learn more about who the group is, you can record that information with group.
         * 
         * @param groupId A database ID for this group.
         * @param traits A dictionary of traits you know about the group. Things like: name, employees, etc.
         */
        public group(groupId: string, traits: JsonMap = {}) {
            return this.wrapper.call(() => Bridge.group(groupId, traits))
        }

        /**
         * Merge two user identities, effectively connecting two sets of user data as one.
         * This may not be supported by all integrations.
         * 
         * When you learn more about who the group is, you can record that information with group.
         * 
         * @param newId The new ID you want to alias the existing ID to.
         * The existing ID will be either the previousId if you have called identify, or the anonymous ID.
         */
        public alias(newId: string) {
            return this.wrapper.call(() => Bridge.alias(newId))
        }

        /**
         * Reset any user state that is cached on the device.
         * 
         * This is useful when a user logs out and you want to clear the identity.
         * It will clear any traits or userId's cached on the device.
         */
        public reset() {
            return this.wrapper.call(Bridge.reset)
        }

        /**
         * Trigger an upload of all queued events.
         * 
         * This is useful when you want to force all messages queued on the device to be uploaded.
         * Please note that not all integrations respond to this method.
         */
        public flush() {
            return this.wrapper.call(Bridge.flush)
        }

        /**
         * Enable the sending of analytics data. Enabled by default.
         * 
         * Occasionally used in conjunction with disable user opt-out handling.
         */
        public enable() {
            return this.wrapper.call(Bridge.enable)
        }

        /**
         * Completely disable the sending of any analytics data.
         * 
         * If you have a way for users to actively or passively (sometimes based on location) opt-out of
         * analytics data collection, you can use this method to turn off all data collection.
         */
        public disable() {
            return this.wrapper.call(Bridge.disable)
        }

        private handleError(error: Error) {
            const {handlers} = this

            if(!handlers.length) {
                console.error('Uncaught Analytics error', error)
                throw error
            }
            else {
                handlers.forEach(handler => handler(error))
            }
        }
    }

    export type Integration =
        | (() => PromiseLike<void>)
        | {disabled: true}

    export type WriteKey = 
        | string
        | {
            android: string
            ios: string
        }

    export namespace ChainedConfiguration {
        export interface Base {
            /**
             * Finalize the configuration and initialize the Analytics client.
             * @param writeKey your Segment.io write key
             */
            setup(writeKey: WriteKey): Promise<Client>
            /**
             * Access iOS specific settings
             */
            ios(): iOS
            /**
             * Access Android specific settings
             */
            android(): Android
        }
        export interface Configuration extends Base {
            /**
             * Whether the analytics client should automatically make a screen call when a
             * view controller is added to a view hierarchy.
             * Because the iOS underlying implementation uses method swizzling,
             * we recommend initializing the analytics client as early as possible (before any screens are displayed).
             */
            recordScreenViews(): this
            /**
             * Enable the automatic tracking of application lifecycle events, such as
             * "Application Installed", "Application Updated" and "Application Opened".
             */
            trackAppLifecycleEvents(): this
            /**
             * Whether the analytics client should automatically track attribution data from enabled providers using the mobile service.
             */
            trackAttributionData(): this
            /**
             * The number of queued events that the analytics client should flush at.
             * 
             * Setting this to `1` will not queue any events and will use more battery.
             * `20` by default.
             */
            flushAt(at: number): this
            /**
             * Register a set of integrations to be used with this Analytics instance.
             */
            using(...integrations: Integration[]): this
            debug(): this
        }
        export interface iOS extends Base {
            /**
             * Whether the analytics client should record bluetooth information.
             * 
             * When enabled please make sure to add a description for `NSBluetoothPeripheralUsageDescription` in
             * your `Info.plist` explaining explaining why your app is accessing Bluetooth APIs.
             */
            recordBluetooth(): this
            /**
             * Whether the analytics client should track advertisting info.
             */
            trackAdvertising(): this
            /**
             * Whether the analytics client should automatically track deep links.
             * 
             * You'll still need to call the continueUserActivity and openURL methods on the analytics client.
             */
            trackDeepLinks(): this
        }
        export interface Android extends Base {
            /**
             * Disable the collection of the device identifier. Enabled by default.
             * 
             * The device identifier is obtained using :
             * - `android.provider.Settings.Secure.ANDROID_ID`
             * - `android.os.Build.SERIAL`
             * - or Telephony Identifier retrieved via TelephonyManager as available
             */
            disableDeviceId(): this
        }
    }
}

export type JsonValue = boolean | number | string | null | JsonList | JsonMap
export interface JsonMap {
    [key: string]: JsonValue
    [index: number]: JsonValue
}
export interface JsonList extends Array<JsonValue> {}
