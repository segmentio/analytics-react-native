# @segment/analytics-react-native

### 🎉 Flagship 🎉
This library is one of Segment’s most popular Flagship libraries. It is actively maintained by Segment, benefitting from new feature releases and ongoing support.


The hassle-free way to add Segment analytics to your React-Native app.

⚠️ This readme covers `analytics-react-native 2.0.0` and greater. The code and readme for `analytics-react-native` versions below `2.0.0` can be found on the `analytics-react-native-v1` branch. On May 15, 2023, Segment will end support for Analytics React Native Classic, which includes versions 1.5.1 and older. Upgrade to Analytics React Native 2.0. 



## Table of Contents

- [@segment/analytics-react-native](#segmentanalytics-react-native)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Expo](#expo)
    - [Permissions](#permissions)
  - [Migrating](#migrating)
  - [Usage](#usage)
    - [Setting up the client](#setting-up-the-client)
    - [Client Options](#client-options)
    - [iOS Deep Link Tracking Setup](#ios-deep-link-tracking-setup)
    - [Native AnonymousId](#native-anonymousid)
    - [Usage with hooks](#usage-with-hooks)
    - [useAnalytics()](#useanalytics)
    - [Usage without hooks](#usage-without-hooks)
  - [Client methods](#client-methods)
    - [Track](#track)
    - [Screen](#screen)
    - [Identify](#identify)
    - [Group](#group)
    - [Alias](#alias)
    - [Reset](#reset)
    - [Flush](#flush)
    - [(Advanced) Cleanup](#advanced-cleanup)
  - [Automatic screen tracking](#automatic-screen-tracking)
    - [React Navigation](#react-navigation)
    - [React Native Navigation](#react-native-navigation)
  - [Consent Management](#consent-management)
    - [Segment CMP](#segment-managed-cmp)
    - [Event Stamping](#event-stamping)
    - [Segment Consent Preference Updated Event](#segment-consent-preference-updated-event)
    - [Event Flow](#event-flow)
    - [Getting Started](#getting-started)
  - [Plugins + Timeline architecture](#plugins--timeline-architecture)
    - [Plugin Types](#plugin-types)
    - [Destination Plugins](#destination-plugins)
    - [Adding Plugins](#adding-plugins)
    - [Writing your own Plugins](#writing-your-own-plugins)
    - [Supported Plugins](#supported-plugins)
  - [Controlling Upload With Flush Policies](#controlling-upload-with-flush-policies)
  - [Adding or removing policies](#adding-or-removing-policies)
    - [Creating your own flush policies](#creating-your-own-flush-policies)
  - [Handling errors](#handling-errors)
    - [Reporting errors from plugins](#reporting-errors-from-plugins)
  - [Contributing](#contributing)
  - [Code of Conduct](#code-of-conduct)
  - [License](#license)

## Installation

Install `@segment/analytics-react-native`,  [`@segment/sovran-react-native`](https://github.com/segmentio/analytics-react-native/blob/master/packages/sovran) and [`react-native-get-random-values`](https://github.com/LinusU/react-native-get-random-values):

```sh
yarn add @segment/analytics-react-native @segment/sovran-react-native react-native-get-random-values @react-native-async-storage/async-storage 
# or
npm install --save @segment/analytics-react-native @segment/sovran-react-native react-native-get-random-values @react-native-async-storage/async-storage 
```

*Note: `@react-native-async-storage/async-storage` is an optional dependency. If you wish to use your own persistence layer you can use the `storePersistor` option when initializing the client. Make sure you always have a persistor (either by having AsyncStorage package installed or by explicitly passing a value), else you might get unexpected side-effects like multiple 'Application Installed' events. Read more [Client Options](#client-options)*

For iOS, install native modules with:

```sh
npx pod-install
```
⚠️ For Android, you will have to add some extra permissions to your `AndroidManifest.xml`.

### Expo 

🚀 `@segment/analytics-react-native 2.0` is compatible with Expo's [Custom Dev Client](https://docs.expo.dev/clients/getting-started/) and [EAS builds](https://docs.expo.dev/build/introduction/) without any additional configuration. Destination Plugins that require native modules may require custom [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/).

⚠️ `@segment/analytics-react-native 2.0` is not compatible with Expo Go. 
### Permissions

<details>

<summary>Android</summary>
In your app's `AndroidManifest.xml` add the below line between the `<manifest>` tags.

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

</details>

## Migrating
See the [Migration Guide](MIGRATION_GUIDE.md) for a detailed walkthrough of the changes you will need to make when upgrading to `analytics-react-native 2.0`

## Usage

### Setting up the client

The package exposes a method called `createClient` which we can use to create the Segment Analytics client. This
central client manages all our tracking events.

```js
import { createClient } from '@segment/analytics-react-native';

const segmentClient = createClient({
  writeKey: 'SEGMENT_API_KEY'
});
```

You must pass at least the `writeKey`. Additional configuration options are listed below:
  
### Client Options

| **Name**                   | **Default**  | **Description**                                                                                                                                                                               |
|----------------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `writeKey` **(REQUIRED)**   | ''           | Your Segment API key.                                                                                                                                                                         |
| `collectDeviceId`           | false        | Set to true to automatically collect the device Id from the DRM API on Android devices.                                                                                                      |
| `debug`                     | true\*       | When set to false, it will not generate any logs.                                                                                                                                              |
| `logger`                    | undefined    | Custom logger instance to expose internal Segment client logging.                                                                                                                            |
| `flushAt`                   | 20           | How many events to accumulate before sending events to the backend.                                                                                                                            |
| `flushInterval`             | 30           | In seconds, how often to send events to the backend.                                                                                                                                           |
| `flushPolicies`             | undefined    | Add more granular control for when to flush, see [Adding or removing policies](#adding-or-removing-policies). **Mutually exclusive with flushAt/flushInterval**                               |
| `maxBatchSize`              | 1000         | How many events to send to the API at once                                                                                                                                                      |
| `trackAppLifecycleEvents`   | false        | Enable automatic tracking for [app lifecycle events](https://segment.com/docs/connections/spec/mobile/#lifecycle-events): application installed, opened, updated, backgrounded.               |
| `trackDeepLinks`            | false        | Enable automatic tracking for when the user opens the app via a deep link (Note: Requires additional setup on iOS, [see instructions](#ios-deep-link-tracking-setup)).                       |
| `defaultSettings`           | undefined    | Settings that will be used if the request to get the settings from Segment fails. Type: [SegmentAPISettings](https://github.com/segmentio/analytics-react-native/blob/c0a5895c0c57375f18dd20e492b7d984393b7bc4/packages/core/src/types.ts#L293-L299) |
| `autoAddSegmentDestination` | true         | Set to false to skip adding the SegmentDestination plugin.                                                                                                                                   |
| `storePersistor`            | undefined    | A custom persistor for the store that `analytics-react-native` leverages. Must match [`Persistor`](https://github.com/segmentio/analytics-react-native/blob/master/packages/sovran/src/persistor/persistor.ts#L1-L18) interface exported from [sovran-react-native](https://github.com/segmentio/analytics-react-native/blob/master/packages/sovran). |
| `proxy`                     | undefined    | `proxy` is a batch URL to post the events. Enable `useSegmentEndpoint` if proxy domain is provided and you want to append the Segment endpoints automatically. If you want to completely customize the proxy by providing a custom URL, disable `useSegmentEndpoint`. Default value is `false`. |
| `errorHandler`              | undefined    | Create custom actions when errors happen, see [Handling errors](#handling-errors).                                                                                                            |
| `cdnProxy`                  | undefined    | Sets an alternative CDN host for settings retrieval. Enable `useSegmentEndpoint` if cdnProxy domain is provided and you want to append the Segment endpoints automatically. Note - Prior to version 2.20.4, whatever was provided as the cdnProxy in the config was automatically appended with /write-key/settings. Starting from v2.20.4, this behavior has changed—now, the SDK will behave according to `useSegmentEndpoints` flag.              |
| `useSegmentEndpoint`        | false        | Set to `true` to automatically append the Segment endpoints when using `proxy` or `cdnProxy` to send or fetch settings. This will enable automatic routing to the appropriate endpoints.      |



\* The default value of `debug` will be false in production.

### iOS Deep Link Tracking Setup
*Note: This is only required for iOS if you are using the `trackDeepLinks` option. Android does not require any additional setup*

To track deep links in iOS you must add the following to your `AppDelegate.m` file:

```objc
  #import <segment_analytics_react_native-Swift.h>
  
  ...
  
- (BOOL)application:(UIApplication *)application
            openURL: (NSURL *)url
            options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  
  [AnalyticsReactNative trackDeepLink:url withOptions:options];  
  return YES;
}
```

If you are using Expo, you need to create an [AppDelegateSubscriber](https://docs.expo.dev/modules/appdelegate-subscribers/), make sure to include `segment_analytics_react_native` in your `podspec` file.
The rest of the code looks like this:
```swift
    import segment_analytics_react_native

    ...

    open func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
       AnalyticsReactNative.trackDeepLink(url: url as NSURL, options: options)
       return false
   }
```

### Native AnonymousId 

If you need to generate an `anonymousId` either natively or before the Analytics React Native package is initialized, you can send the anonymousId value from native code. The value has to be generated and stored by the caller. For reference, you can find a working example in the app and reference the code below: 

**iOS**
```objc
...
#import <segment_analytics_react_native-Swift.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  ...
  // generate your anonymousId value
  // dispatch it across the bridge

  [AnalyticsReactNative setAnonymousId: @"My-New-Native-Id"];
  return yes
}
```
**Android**
```java
// MainApplication.java
...
import com.segmentanalyticsreactnative.AnalyticsReactNativePackage;

...
private AnalyticsReactNativePackage analytics = new AnalyticsReactNativePackage();

...
   @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      // AnalyticsReactNative will be autolinked by default, but to send the anonymousId before RN startup you need to manually link it to store a reference to the package
      packages.add(analytics);
      return packages;
    }
...
  @Override
  public void onCreate() {
    super.onCreate();
    ...

  // generate your anonymousId value
  // dispatch it across the bridge

  analytics.setAnonymousId("My-New-Native-Id");
  }
```

### Usage with hooks

In order to use the `useAnalytics` hook within the application, we will additionally need to wrap the application in
an AnalyticsProvider. This uses the [Context API](https://reactjs.org/docs/context.html) and will allow
access to the analytics client anywhere in the application

```js
import {
  createClient,
  AnalyticsProvider,
} from '@segment/analytics-react-native';

const segmentClient = createClient({
  writeKey: 'SEGMENT_API_KEY'
});

const App = () => (
  <AnalyticsProvider client={segmentClient}>
    <Content />
  </AnalyticsProvider>
);
```

### useAnalytics()

The client methods will be exposed via the `useAnalytics()` hook:

```js
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAnalytics } from '@segment/analytics-react-native';

const Button = () => {
  const { track } = useAnalytics();
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        track('Awesome event');
      }}
    >
      <Text style={styles.text}>Press me!</Text>
    </TouchableOpacity>
  );
};
```

### Usage without hooks

The tracking events can also be used without hooks by calling the methods directly on the client:

```js
import {
  createClient,
  AnalyticsProvider,
} from '@segment/analytics-react-native';

// create the client once when the app loads
const segmentClient = createClient({
  writeKey: 'SEGMENT_API_KEY'
});

// track an event using the client instance
segmentClient.track('Awesome event');
```

## Client methods

### Track

The [track](https://segment.com/docs/connections/spec/track/) method is how you record any actions your users perform, along with any properties that describe the action.

Method signature:

```js
track: (event: string, properties?: JsonMap) => void;
```

Example usage:

```js
const { track } = useAnalytics();

track('View Product', {
  productId: 123,
  productName: 'Striped trousers',
});
```

### Screen

The [screen](https://segment.com/docs/connections/spec/screen/) call lets you record whenever a user sees a screen in your mobile app, along with any properties about the screen.

Method signature:

```js
screen: (name: string, properties?: JsonMap) => void;
```

Example usage:

```js
const { screen } = useAnalytics();

screen('ScreenName', {
  productSlug: 'example-product-123',
});
```

For setting up automatic screen tracking, see the [instructions below](#automatic-screen-tracking).

### Identify

The [identify](https://segment.com/docs/connections/spec/identify/) call lets you tie a user to their actions and record traits about them. This includes a unique user ID and any optional traits you know about them like their email, name, etc. The traits option can include any information you might want to tie to the user, but when using any of the [reserved user traits](https://segment.com/docs/connections/spec/identify/#traits), you should make sure to only use them for their intended meaning.

Method signature:

```js
identify: (userId: string, userTraits?: JsonMap) => void;
```

Example usage:

```js
const { identify } = useAnalytics();

identify('user-123', {
  username: 'MisterWhiskers',
  email: 'hello@test.com',
  plan: 'premium',
});
```

### Group

The [group](https://segment.com/docs/connections/spec/group/) API call is how you associate an individual user with a group—be it a company, organization, account, project, team or whatever other crazy name you came up with for the same concept! This includes a unique group ID and any optional group traits you know about them like the company name industry, number of employees, etc. The traits option can include any information you might want to tie to the group, but when using any of the [reserved group traits](https://segment.com/docs/connections/spec/group/#traits), you should make sure to only use them for their intended meaning.

Method signature:

```js
group: (groupId: string, groupTraits?: JsonMap) => void;
```

Example usage:

```js
const { group } = useAnalytics();

group('some-company', {
  name: 'Segment',
});
```

### Alias

The [alias](https://segment.com/docs/connections/spec/alias/) method is used to merge two user identities, effectively connecting two sets of user data as one. This is an advanced method, but it is required to manage user identities successfully in some of our destinations.

Method signature:

```js
alias: (newUserId: string) => void;
```

Example usage:

```js
const { alias } = useAnalytics();

alias('user-123');
```

### Reset

The reset method clears the internal state of the library for the current user and group. This is useful for apps where users can log in and out with different identities over time.

Note: Each time you call reset, a new AnonymousId is generated automatically.

And when false is passed as an argument in reset method, it will skip resetting the anonymousId (but reset the rest of the user date).

Method signature:

```js
reset: (resetAnonymousId = true) => void;
```

Example usage:

```js
const { reset } = useAnalytics();

reset();

reset(resetAnonymousId = false);
```

### Flush

By default, the analytics will be sent to the API after 30 seconds or when 20 items have accumulated, whatever happens sooner, and whenever the app resumes if the user has closed the app with some events unsent. These values can be modified by the `flushAt` and `flushInterval` config options. You can also trigger a flush event manually.

Method signature:

```js
flush: () => Promise<void>;
```

Example usage:

```js
const { flush } = useAnalytics();

flush();
```

### (Advanced) Cleanup

You probably don't need this!

In case you need to reinitialize the client, that is, you've called `createClient` more than once for the same client in your application lifecycle, use this method _on the old client_ to clear any subscriptions and timers first.

```js
let client = createClient({
  writeKey: 'KEY'
});

client.cleanup();

client = createClient({
  writeKey: 'KEY'
});
```

If you don't do this, the old client instance would still exist and retain the timers, making all your events fire twice.

Ideally, you shouldn't need this though, and the Segment client should be initialized only once in the application lifecycle.

## Automatic screen tracking

Sending a `screen()` event with each navigation action will get tiresome quick, so you'll probably want to track navigation globally. The implementation will be different depending on which library you use for navigation. The two main navigation libraries for React Native are [React Navigation](https://reactnavigation.org/) and [React Native Navigation](https://wix.github.io/react-native-navigation).

### React Navigation

Our [example app](./example) is set up with screen tracking using React Navigation, so you can use it as a guide.

Essentially what we'll do is find the root level navigation container and call `screen()` whenever user has navigated to a new screen.

Find the file where you've used the `NavigationContainer` - the main top level container for React Navigation. In this component, create 2 new refs to store the `navigation` object and the current route name:

```js
const navigationRef = useRef(null);
const routeNameRef = useRef(null);
```

Next, pass the ref to `NavigationContainer` and a function in the `onReady` prop to store the initial route name. Finally, pass a function in the `onStateChange` prop of your `NavigationContainer` that checks for the active route name and calls `client.screen()` if the route has changes. You can pass in any additional screen parameters as the second argument for screen call as needed.

```js
<NavigationContainer
  ref={navigationRef}
  onReady={() => {
    routeNameRef.current = navigationRef.current.getCurrentRoute().name;
  }}
  onStateChange={() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute().name;

    if (previousRouteName !== currentRouteName) {
      segmentClient.screen(currentRouteName);
      routeNameRef.current = currentRouteName;
    }
  }}
>
```

### React Native Navigation

In order to setup automatic screen tracking while using [React Native Navigation](https://wix.github.io/react-native-navigation/docs/before-you-start/), you will have to use an [event listener](https://wix.github.io/react-native-navigation/api/events#componentdidappear). That can be done at the point where you are setting up the root of your application (ie. `Navigation.setRoot`). There your will need access to your `SegmentClient`.

```js
// Register the event listener for *registerComponentDidAppearListener*
Navigation.events().registerComponentDidAppearListener(({ componentName }) => {
  segmentClient.screen(componentName);
});
```

## Consent Management

Consent Management is the management of a user’s consent preferences related to privacy.  You might be familiar with the Privacy Pop-ups that have become mandated recently that ask the user if he or she consents to the use of certain category of cookies:

![Sample CMP UI](imgs/cmp-sample.png?raw=true "Sample CMP UI")


The Privacy pop-up asks the user if he or she will consent to the use of cookies and allows the user to customize their consent by turning on/off different categories of cookies.

After the user selects “Allow All” or “Save Preferences” a callback is fired and the owner of the website is notified as to the consent preferences of a given user. The website owner must then store that consent preference and abide by it. Any rejected cookies must not be set or read to avoid large fines that can be handed down by government authorities.

Additionally, besides the initial pop-up the website owner must give users a way to later change any preferences they originally selected. This is usually accomplished by providing a link to display the customization screen.


### Segment managed CMP

Segment provides a framework for users to integrate any CMP they choose and use the Segment web app to map consent categories to device mode destinations. This information is sent down the analytics-kotlin SDK and stored for later lookup.

Every event that flows through the library will be stamped with the current status according to whatever configured CMP is used. Event stamping is handled by the ConsentManagementPlugin. 

Using consent status stamped on the events and the mappings sent down from the Segment web app each event is evaluated and action is taken. Currently the supported actions are:

- Blocking - This action is implemented by the ConsentBlockingPlugin

### Event Stamping

Event stamping is the process of adding the consent status information to an existing event. The information is added to the context object of every event. Below is a before and after example:

Before

```json
{
    "anonymousId": "23adfd82-aa0f-45a7-a756-24f2a7a4c895",
    "type": "track",
    "event": "MyEvent",
    "userId": "u123",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "context": {
        "traits": {
            "email": "peter@example.com",
            "phone": "555-555-5555"
        },
        "device": {
            "advertisingId": "7A3CBBA0-BDF5-11E4-8DFC-AA02A5B093DB"
        }
    }
}
```
After

```json
{
    "anonymousId": "23adfd82-aa0f-45a7-a756-24f2a7a4c895",
    "type": "track",
    "event": "MyEvent",
    "userId": "u123",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "context": {
        "traits": {
            "email": "peter@example.com",
            "phone": "555-555-5555"
        },
        "device": {
            "advertisingId": "7A3CBBA0-BDF5-11E4-8DFC-AA02A5B093DB"
        },
        "consent": {
            "categoryPreferences": {
                "Advertising": true,
                "Analytics": false,
                "Functional": true,
                "DataSharing": false
            }
        }
    }
}
```

### Segment Consent Preference Updated Event

When notified by the CMP SDK that consent has changed, a track event with name “Segment Consent Preference Updated” will be emitted. Below is example of what that event will look like:

```json
{
    "anonymousId": "23adfd82-aa0f-45a7-a756-24f2a7a4c895",
    "type": "track",
    "event": "Segment Consent Preference Updated",
    "userId": "u123",
    "timestamp": "2023-01-01T00:00:00.000Z",
    "context": {
        "device": {
            "advertisingId": "7A3CBEA0-BDF5-11E4-8DFC-AA07A5B093DB"
        },
        "consent": {
            "categoryPreferences": {
                "Advertising": true,
                "Analytics": false,
                "Functional": true,
                "DataSharing": false
            }
        }
    }
}
```

### Event Flow


![Shows how an event is stamped and later checked for consent](imgs/main-flow-diagram.png?raw=true "Event Flow Diagram")

1. An event is dropped onto the timeline by some tracking call.
2. The ConsentManagementPlugin consumes the event, stamps it, and returns it.
3. The event is now stamped with consent information from this point forward.
4. The event is copied. The copy is consumed by a Destination Plugin and continues down its internal timeline. The original event is returned and continues down the main timeline.
   a. The stamped event is now on the timeline of the destination plugin.
   b. The event reaches the ConsentBlockingPlugin which makes a decision as to whether or not to let the event continue down the timeline.
   c. If the event has met the consent requirements it continues down the timeline.
5. The event continues down the timeline.

### Getting Started

1. Since the Consent Management Plugin is built into the core `Analytics-React-Native` SDK, you can simply import it and begin using it without adding any additional Segment dependencies. 

```
import { createClient, ConsentPlugin} from '@segment/analytics-react-native';
```
2. From here, you will have to build an Consent Provider integration with your CMP. You can reference our example `OneTrust` [integration here](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-onetrust). It is not possible for Segment to support this as an active plugin as OneTrust requires you to use very specific versions of their SDK. However, the functionality is usually unchanged across versions so the example linked above should be almost copy/paste. If you build your own, it needs to imlpement the `CategoryConsentProvider` interface:

```
interface CategoryConsentStatusProvider {
  setApplicableCategories(categories: string[]): void;
  getConsentStatus(): Promise<Record<string, boolean>>;
  onConsentChange(cb: (updConsent: Record<string, boolean>) => void): void;
  shutdown?(): void;
}
```

3. Add the Consent Provider to the `ConsentPlugin()` and add `ConsentPlugin()` to the `client`. A full example of this setup, including initializing the `OneTrust` SDK can be [found here](https://github.com/segmentio/analytics-react-native/blob/master/packages/plugins/plugin-onetrust/README.md).


```
const segment = createClient({
  writeKey: 'SEGMENT_KEY',
  ...<other config options>
});


const myCustomProvider = new MyCustomProvider(MyCMP)
const consentPlugin = new ConsentPlugin(myCustomProvider);

segment.add({ plugin: oneTrustPlugin });
```

4. Once the Segment Client and third-party CMP have been initialized, start processing queued events

```
consentPlugin.start()
```

## Plugins + Timeline architecture

You have complete control over how the events are processed before being uploaded to the Segment API.

In order to customise what happens after an event is created, you can create and place various Plugins along the processing pipeline that an event goes through. This pipeline is referred to as a Timeline.

### Plugin Types

| Plugin Type  | Description                                                                                             |
|--------------|---------------------------------------------------------------------------------------------------------|
| before       | Executed before event processing begins.                                                                |
| enrichment   | Executed as the first level of event processing.                                                        |
| destination  | Executed as events begin to pass off to destinations.                                                   |
| after        | Executed after all event processing is completed.  This can be used to perform cleanup operations, etc. |
| utility      | Executed only when called manually, such as Logging.                                                    |

Plugins can have their own native code (such as the iOS-only `IdfaPlugin`) or wrap an underlying library (such as `FirebasePlugin` which uses `react-native-firebase` under the hood)

### Destination Plugins

Segment is included as a `DestinationPlugin` out of the box. You can add as many other DestinationPlugins as you like, and upload events and data to them in addition to Segment.

Or if you prefer, you can pass `autoAddSegmentDestination = false` in the options when setting up your client. This prevents the SegmentDestination plugin from being added automatically for you.

### Adding Plugins

You can add a plugin at any time through the `segmentClient.add()` method.

```js
import { createClient } from '@segment/analytics-react-native';

import { AmplitudeSessionPlugin } from '@segment/analytics-react-native-plugin-amplitude-session';
import { FirebasePlugin } from '@segment/analytics-react-native-plugin-firebase';
import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new AmplitudeSessionPlugin() });
segmentClient.add({ plugin: new FirebasePlugin() });
segmentClient.add({ plugin: new IdfaPlugin() });
```

### Writing your own Plugins

Plugins are implemented as ES6 Classes. To get started, familiarise yourself with the available classes in `/packages/core/src/plugin.ts`.

The available plugin classes are:-

- `Plugin`
- `EventPlugin`
- `DestinationPlugin`
- `UtilityPlugin`
- `PlatformPlugin`

Any plugins must be an extension of one of these classes.

You can them customise the functionality by overriding different methods on the base class. For example, here is a simple `Logger` plugin:

```js
// logger.js

import {
  Plugin,
  PluginType,
  SegmentEvent,
} from '@segment/analytics-react-native';

export class Logger extends Plugin {

  // Note that `type` is set as a class property
  // If you do not set a type your plugin will be a `utility` plugin (see Plugin Types above)
  type = PluginType.before;

  execute(event: SegmentEvent) {
    console.log(event);
    return event;
  }
}
```

```js
// app.js

import { Logger } from './logger';

segmentClient.add({ plugin: new Logger() });
```

As it overrides the `execute()` method, this `Logger` will call `console.log` for every event going through the Timeline.
  
### Supported Plugins 
  
Refer to the following table for Plugins you can use to meet your tracking needs:
  
| Plugin      | Package     |
| ----------- | ----------- |
| [Adjust](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-adjust)      | `@segment/analytics-react-native-plugin-adjust`|
| [Amplitude Sessions](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-amplitudeSession)      | `@segment/analytics-react-native-plugin-amplitude-session`|
| [AppsFlyer](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-appsflyer)    | `@segment/analytics-react-native-plugin-appsflyer`|
| [Braze](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-braze)      | `@segment/analytics-react-native-plugin-braze`|
| [Braze Middleware (Cloud Mode)](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-braze)      | `@segment/analytics-react-native-plugin-braze-middleware`|
| [CleverTap](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-clevertap)      | `@segment/analytics-react-native-plugin-clevertap`|
| [Facebook App Events](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-facebook-app-events)    | `@segment/analytics-react-native-plugin-facebook-app-events` |
| [Firebase](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-firebase)      | `@segment/analytics-react-native-plugin-firebase`|
| [FullStory](https://github.com/fullstorydev/segment-react-native-plugin-fullstory) | `@fullstory/segment-react-native-plugin-fullstory`|
| [IDFA](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-idfa)     | `@segment/analytics-react-native-plugin-idfa` |
| [Mixpanel](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-mixpanel)    | `@segment/analytics-react-native-plugin-mixpanel` |
| [Sprig](https://github.com/UserLeap/analytics-react-native-plugin-sprig)    | [`@sprig-technologies/analytics-react-native-plugin-sprig`](https://www.npmjs.com/package/@sprig-technologies/analytics-react-native-plugin-sprig) |
| [Taplytics](https://github.com/taplytics/segment-react-native-plugin-taplytics)     | `@taplytics/segment-react-native-plugin-taplytics` |
| [Android Advertising ID](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-advertising-id) | `@segment/analytics-react-native-plugin-advertising-id` |
| [Survicate](https://github.com/Survicate/analytics-react-native-survicate) | `@survicate/analytics-react-native-survicate` |
  
  
## Controlling Upload With Flush Policies

To more granurily control when events are uploaded you can use `FlushPolicies`. **This will override any setting on `flushAt` and `flushInterval`, but you can use `CountFlushPolicy` and `TimerFlushPolicy` to have the same behaviour respectively.**

A Flush Policy defines the strategy for deciding when to flush, this can be on an interval, on a certain time of day, after receiving a certain number of events or even after receiving a particular event. This gives you even more flexibility on when to send event to Segment.

To make use of flush policies you can set them in the configuration of the client:

```ts
const client = createClient({
  // ...
  flushPolicies: [
    new CountFlushPolicy(5),
    new TimerFlushPolicy(500),
    new StartupFlushPolicy(),
  ],
});
```

You can set several policies at a time. Whenever any of them decides it is time for a flush it will trigger an upload of the events. The rest get reset so that their logic restarts after every flush. 

That means only the first policy to reach `shouldFlush` gets to trigger a flush at a time. In the example above either the event count gets to 5 or the timer reaches 500ms, whatever comes first will trigger a flush.

We have several standard FlushPolicies:
- `CountFlushPolicy` triggers whenever a certain number of events is reached
- `TimerFlushPolicy` triggers on an interval of milliseconds
- `StartupFlushPolicy` triggers on client startup only
- `BackgroundFlushPolicy` triggers when the app goes into the background/inactive.

## Adding or removing policies

One of the main advatanges of FlushPolicies is that you can add and remove policies on the fly. This is very powerful when you want to reduce or increase the amount of flushes. 

For example you might want to disable flushes if you detect the user has no network:

```ts

import NetInfo from "@react-native-community/netinfo";

const policiesIfNetworkIsUp = [
  new CountFlushPolicy(5),
  new TimerFlushPolicy(500),
];

// Create our client with our policies by default
const client = createClient({
  // ...
  flushPolicies: policies,
});

// If we detect the user disconnects from the network remove all flush policies, 
// that way we won't keep attempting to send events to segment but we will still 
// store them for future upload.
// If the network comes back up we add the policies back
const unsubscribe = NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    client.addFlushPolicy(...policiesIfNetworkIsUp);
  } else {
    client.removeFlushPolicy(...policiesIfNetworkIsUp)
  }
});

```

### Creating your own flush policies

You can create a custom FlushPolicy special for your application needs by implementing the  `FlushPolicy` interface. You can also extend the `FlushPolicyBase` class that already creates and handles the `shouldFlush` value reset.

A `FlushPolicy` only needs to implement 2 methods:
- `start()`: Executed when the flush policy is enabled and added to the client. This is a good place to start background operations, make async calls, configure things before execution
- `onEvent(event: SegmentEvent)`: Gets called on every event tracked by your client
- `reset()`: Called after a flush is triggered (either by your policy, by another policy or manually)

They also have a `shouldFlush` observable boolean value. When this is set to true the client will atempt to upload events. Each policy should reset this value to `false` according to its own logic, although it is pretty common to do it inside the `reset` method.

```ts
export class FlushOnScreenEventsPolicy extends FlushPolicyBase {

  onEvent(event: SegmentEvent): void {
    // Only flush when a screen even happens
    if (event.type === EventType.ScreenEvent) {
      this.shouldFlush.value = true;
    }
  }

  reset(): void {
    // Superclass will reset the shouldFlush value so that the next screen event triggers a flush again
    // But you can also reset the value whenever, say another event comes in or after a timeout
    super.reset();
  }
}
```

## Handling errors

You can handle analytics client errors through the `errorHandler` option.

The error handler configuration receives a function which will get called whenever an error happens on the analytics client. It will receive an argument of [`SegmentError`](packages/core/src/errors.ts#L20) type. 

You can use this error handling to trigger different behaviours in the client when a problem occurs. For example if the client gets rate limited you could use the error handler to swap flush policies to be less aggressive:

```ts
const flushPolicies = [new CountFlushPolicy(5), new TimerFlushPolicy(500)];

const errorHandler = (error: SegmentError) => {
  if (error.type === ErrorType.NetworkServerLimited) {
    // Remove all flush policies
    segmentClient.removeFlushPolicy(...segmentClient.getFlushPolicies());
    // Add less persistent flush policies
    segmentClient.addFlushPolicy(
      new CountFlushPolicy(100),
      new TimerFlushPolicy(5000)
    );
  }
};

const segmentClient = createClient({
  writeKey: 'WRITE_KEY',
  trackAppLifecycleEvents: true,
  collectDeviceId: true,
  debug: true,
  trackDeepLinks: true,
  flushPolicies: flushPolicies,
  errorHandler: errorHandler,
});

```

The reported errors can be of any of the [`ErrorType`](packages/core/src/errors.ts#L4) enum values. 

### Reporting errors from plugins

Plugins can also report errors to the handler by using the [`.reportInternalError`](packages/core/src/analytics.ts#L741) function of the analytics client, we recommend using the `ErrorType.PluginError` for consistency, and attaching the `innerError` with the actual exception that was hit:

```ts
  try {
    distinctId = await mixpanel.getDistinctId();
  } catch (e) {
    analytics.reportInternalError(
      new SegmentError(ErrorType.PluginError, 'Error: Mixpanel error calling getDistinctId', e)
    );
    analytics.logger.warn(e);
  }
```




## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## Code of Conduct

Before contributing, please also see our [code of conduct](CODE_OF_CONDUCT.md).

## License

MIT

[circleci-image]: https://circleci.com/gh/segmentio/analytics-react-native.svg?style=shield&circle-token=c08ac0da003f36b2a8901be421a6998124e1d352
[circleci-url]: https://app.circleci.com/pipelines/github/segmentio/analytics-react-native
