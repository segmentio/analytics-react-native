# @segment/analytics-react-native [![circleci][circleci-image]][circleci-url]

The hassle-free way to add Segment analytics to your React-Native app.

NOTE: This project is currently in development and is covered by Segment's [First Access & Beta Preview Terms](https://segment.com/legal/first-access-beta-preview/). We encourage you to try out this new library. Please provide feedback via Github issues/PRs, and feel free to submit pull requests. Customers should not use this library for production applications during our Pilot and Beta phases.

⚠️ This readme covers `analytics-react-native 2.0.0` and greater. The code and readme for `analytics-react-native` versions below `2.0.0` can be found on the `analytics-react-native-v1` branch.  

## Table of Contents

- [Installation](#installation)
  - [Permissions](#permissions)
- [Migration](#migrating)
- [Usage](#usage)
  - [Setting up the client](#setting-up-the-client)
  - [Client options](#client-options)
  - [Usage with hooks](#usage-with-hooks)
  - [useAnalytics](#useanalytics)
  - [Usage without hooks](#usage-without-hooks)
- [Client methods](#client-methods)
  - [Track](#track)
  - [Screen](#screen)
  - [Identify](#identify)
  - [Group](#group)
  - [Alias](#alias)
  - [Reset](#reset)
  - [Flush](#flush)
  - [Advanced Cleanup](#advanced-cleanup)
- [Automatic screen tracking](#automatic-screen-tracking)
  - [React Navigation](#react-navigation)
  - [React Native Navigation](#react-native-navigation)
- [Plugin Architecture](#plugin-types)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)

## Installation

Install `@segment/analytics-react-native` and [`react-native-async-storage/async-storage`](https://github.com/react-native-async-storage/async-storage): 

```sh
yarn add @segment/analytics-react-native @react-native-async-storage/async-storage
# or
npm install --save @segment/analytics-react-native @react-native-async-storage/async-storage
```

For iOS, install native modules with:

```sh
npx pod-install
```
⚠️ For Android, you will have to add some extra permissions to your `AndroidManifest.xml`.

🚀 `@segment/analytics-react-native 2.0` is compatible with Expo's [Custom Dev Client](https://docs.expo.dev/clients/getting-started/) and [EAS builds](https://docs.expo.dev/build/introduction/) without any additional configuration. Destination Plugins that require native modules may require custom [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/).

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

| Name                       | Default   | Description                                                                                                                          |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `writeKey` **(REQUIRED)**  | ''        | Your Segment API key.                                                                                                                |
| `debug`                    | true\*    | When set to false, it will not generate any logs.                                                                                    |
| `flushAt`                  | 20        | How many events to accumulate before sending events to the backend.                                                                  |
| `flushInterval`            | 30        | In seconds, how often to send events to the backend.                                                                                 |
| `retryInterval`            | 60        | In seconds, how often to to retry sending events the request failed (e.g. in case of a network failure).                             |
| `maxBatchSize`             | 1000      | How many events to send to the API at once                                                                                           |
| `maxEventsToRetry`         | 1000      | How many events to keep around for to retry sending if the initial request failed                                                    |
| `trackAppLifecycleEvents`  | false     | Enable automatic tracking for [app lifecycle events](https://segment.com/docs/connections/spec/mobile/#lifecycle-events): application installed, opened, updated, backgrounded) |
| `trackDeepLinks`           | false     | Enable automatic tracking for when the user opens the app via a deep link                                                            |
| `defaultSettings`          | undefined | Settings that will be used if the request to get the settings from Segment fails                                                     |
| `autoAddSegmentDestination`| true      | Set to false to skip adding the SegmentDestination plugin                                                                            |

\* The default value of `debug` will be false in production.

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

// create the client once when he app loads
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

Method signature:

```js
reset: () => void;
```

Example usage:

```js
const { reset } = useAnalytics();

reset();
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

Find the file where you've used the `NavigationContainer` - the main top level container for React Navigation. In this component, create a new state variable to store the current route name:

```js
const [routeName, setRouteName] = useState('Unknown');
```

Now, outside of the component, create a utility function for determining the name of the selected route:

```js
const getActiveRouteName = (
  state: NavigationState | PartialState<NavigationState> | undefined
): string => {
  if (!state || typeof state.index !== 'number') {
    return 'Unknown';
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
};
```

Finally, pass a function in the `onStateChange` prop of your `NavigationContainer` that checks for the active route name and calls `client.screen()` if the route has changes. You can pass in any additional screen parameters as the second argument for screen call as needed.

```js
<NavigationContainer
  onStateChange={(state) => {
    const newRouteName = getActiveRouteName(state);

    if (routeName !== newRouteName) {
      segmentClient.screen(newRouteName);
      setRouteName(newRouteName);
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

import { AmplitudeSessionPlugin } from '@segment/analytics-react-native-plugin-amplitude';
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
  
### Example Plugins 
  
Refer to the following table for example Plugins you can use and alter to meet your tracking needs:
  
| Plugin      | Package     |
| ----------- | ----------- |
| Adjust      | `@segment/analytics-react-native-plugin-adjust`|
| Amplitude Sessions      | `@segment/analytics-react-native-plugin-amplitude-session`|
| AppsFlyer    | `@segment/analytics-react-native-plugin-appsflyer`|
| Braze      | `@segment/analytics-react-native-plugin-braze`|
| Consent Manager     | `@segment/analytics-react-native-plugin-adjust`|
| Facebook App Events    | `@segment/analytics-react-native-plugin-facebook-app-events` |
| Firebase      | `@segment/analytics-react-native-plugin-consent-firebase`|
| IDFA     | `@segment/analytics-react-native-plugin-idfa` |

  
  

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## Code of Conduct

Before contributing, please also see our [code of conduct](CODE_OF_CONDUCT.md).

## License

MIT

[circleci-image]: https://circleci.com/gh/segmentio/analytics-react-native.svg?style=shield&circle-token=c08ac0da003f36b2a8901be421a6998124e1d352
[circleci-url]: https://app.circleci.com/pipelines/github/segmentio/analytics-react-native
