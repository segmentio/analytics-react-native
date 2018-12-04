import Bridge, { JsonMap } from './bridge'
import { configure } from './configuration'
import { Middleware, MiddlewareChain } from './middleware'
import { ErrorHandler, NativeWrapper } from './wrapper'

// prettier-ignore
export module Analytics {
	export type Integration = (() => PromiseLike<void>) | { disabled: true }

	export interface Configuration {
		/**
		 * Whether the analytics client should automatically make a screen call when a
		 * view controller is added to a view hierarchy.
		 * Because the iOS underlying implementation uses method swizzling,
		 * we recommend initializing the analytics client as early as possible.
		 * 
		 * Disabled by default.
		 */
		recordScreenViews?: boolean
		/**
		 * Whether the analytics client should automatically track application lifecycle events, such as
		 * "Application Installed", "Application Updated" and "Application Opened".
		 * 
		 * Disabled by default.
		 */
		trackAppLifecycleEvents?: boolean
		/**
		 * Whether the analytics client should automatically track attribution data from enabled providers using the mobile service.
		 * 
		 * Disabled by default.
		 */
		trackAttributionData?: boolean

		/**
		 * Register a set of integrations to be used with this Analytics instance.
		 */
		using?: Integration[]
		debug?: boolean

		/**
		 * The number of queued events that the analytics client should flush at.
		 * Setting this to `1` will not queue any events and will use more battery.
		 * 
		 * `20` by default.
		 */
		flushAt?: number

		/**
		 * iOS specific settings.
		 */
		ios?: {
			/**
			 * Whether the analytics client should track advertisting info.
			 * 
			 * Disabled by default.
			 */
			trackAdvertising?: boolean
			/**
			 * Whether the analytics client should automatically track deep links.
			 * You'll still need to call the continueUserActivity and openURL methods on the native analytics client.
			 * 
			 * Disabled by default.
			 */
			trackDeepLinks?: boolean
		}
		/**
		 * Android specific settings.
		 */
		android?: {
			/**
			 * Set the interval in milliseconds at which the client should flush events. The client will automatically flush
			 * events to Segment every {@link flushInterval} duration, regardless of {@link flushAt}.
			 */
			flushInterval?: number

			/**
			 * Whether the analytics client should client the device identifier.
			 * The device identifier is obtained using :
			 * - `android.provider.Settings.Secure.ANDROID_ID`
			 * - `android.os.Build.SERIAL`
			 * - or Telephony Identifier retrieved via TelephonyManager as available
			 * 
			 * Enabled by default.
			 */
			collectDeviceId?: boolean
		}
	}

	export class Client {
		/**
		 * Whether the client is ready to send events to Segment.
		 *
		 * This becomes `true` when `.setup()` succeeds.
		 * All calls will be queued until it becomes `true`.
		 */
		public readonly ready = false

		private readonly wrapper = new NativeWrapper(this, err =>
			this.handleError(err)
		)
		private readonly handlers: ErrorHandler[] = []
		private readonly middlewares = new MiddlewareChain(this.wrapper)

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
		 * Append a new middleware to the middleware chain.
		 * 
		 * Middlewares are a powerful mechanism that can augment the events collected by the SDK.
		 * A middleware is a simple function that is invoked by the Segment SDK and can be used to monitor,
		 * modify or reject events.
		 * 
		 * Middlewares are invoked for all events, including automatically tracked events,
		 * and external event sources like Adjust and Optimizely.
		 * This offers you the ability the customize those messages to fit your use case even
		 * if the event was sent outside your source code.
		 * 
		 * The key thing to observe here is that the output produced by the first middleware feeds into the second.
		 * This allows you to chain and compose independent middlewares!
		 * 
		 * For example, you might want to record the device year class with your events.
		 * Previously, you would have to do this everywhere you trigger an event with the Segment SDK.
		 * With middlewares, you can do this in a single place :
		 * 
		 * ```js
		 * import DeviceYearClass from 'react-native-device-year-class'
		 * 
		 * analytics.middleware(async ({next, context}) =>
		 *   next({
		 *     ...context,
		 *     device_year_class: await DeviceYearClass()
		 *   })
		 * )
		 * ```
		 * 
		 * @param middleware 
		 */
		public middleware(middleware: Middleware) {
			this.middlewares.add(middleware)

			return this
		}

		/**
		 * Use the native configuration.
		 * 
		 * You'll need to call this method when you configure Analytics's singleton
		 * using the native API.
		 */
		public useNativeConfiguration() {
			if(this.ready) {
				throw new Error('Analytics has already been configured')
			}

			this.wrapper.ready()

			return this
		}

		/**
		 * Setup the Analytics module. All calls made before are queued
		 * and only executed if the configuration was successful.
		 *
		 * ```js
		 * await analytics.setup('YOUR_WRITE_KEY', {
		 *   using: [Mixpanel, GoogleAnalytics],
		 *   trackAppLifecycleEvents: true,
		 *   ios: {
		 *     trackDeepLinks: true
		 *   }
		 * })
		 * ```
		 * 
		 * @param writeKey Your Segment.io write key
		 * @param configuration An optional {@link Configuration} object.
		 */
		public async setup(writeKey: string, configuration: Configuration = {}) {
			await Bridge.setup(await configure(writeKey, configuration))

			this.wrapper.ready()
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
		public async track(event: string, properties: JsonMap = {}) {
			await this.middlewares.run('track', { event, properties })
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
		public async screen(name: string, properties: JsonMap = {}) {
			await this.middlewares.run('screen', { name, properties })
		}

		/**
		 * Associate a user with their unique ID and record traits about them.
		 *
		 * When you learn more about who your user is, you can record that information with identify.
		 *
		 * @param user database ID (or email address) for this user.
		 * If you don't have a userId but want to record traits, you should pass nil.
		 * For more information on how we generate the UUID and Apple's policies on IDs, see https://segment.io/libraries/ios#ids
		 * @param traits A dictionary of traits you know about the user. Things like: email, name, plan, etc.
		 */
		public async identify(user: string, traits: JsonMap = {}) {
			await this.middlewares.run('identify', { user, traits })
		}

		/**
		 * Associate a user with a group, organization, company, project, or w/e *you* call them.
		 *
		 * When you learn more about who the group is, you can record that information with group.
		 *
		 * @param groupId A database ID for this group.
		 * @param traits A dictionary of traits you know about the group. Things like: name, employees, etc.
		 */
		public async group(groupId: string, traits: JsonMap = {}) {
			await this.middlewares.run('group', { groupId, traits })
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
		public async alias(newId: string) {
			await this.middlewares.run('alias', { newId })
		}

		/**
		 * Reset any user state that is cached on the device.
		 *
		 * This is useful when a user logs out and you want to clear the identity.
		 * It will clear any traits or userId's cached on the device.
		 */
		public async reset() {
			await this.wrapper.run('reset', reset => reset())
		}

		/**
		 * Trigger an upload of all queued events.
		 *
		 * This is useful when you want to force all messages queued on the device to be uploaded.
		 * Please note that not all integrations respond to this method.
		 */
		public async flush() {
			await this.wrapper.run('flush', flush => flush())
		}

		/**
		 * Enable the sending of analytics data. Enabled by default.
		 *
		 * Occasionally used in conjunction with disable user opt-out handling.
		 */
		public async enable() {
			await this.wrapper.run('enable', enable => enable())
		}

		/**
		 * Completely disable the sending of any analytics data.
		 *
		 * If you have a way for users to actively or passively (sometimes based on location) opt-out of
		 * analytics data collection, you can use this method to turn off all data collection.
		 */
		public async disable() {
			await this.wrapper.run('disable', disable => disable())
		}

		private handleError(error: Error) {
			const { handlers } = this

			if (!handlers.length) {
				console.error('Uncaught Analytics error', error)
				throw error
			} else {
				handlers.forEach(handler => handler(error))
			}
		}
	}
}
