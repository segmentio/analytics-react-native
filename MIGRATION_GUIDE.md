# Migrating to 2.0

Analytics-React-Native 2.0 currently supports [these destinations](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins) with Segment actively adding more to the list. 
If you’re using  `analytics-react-native 1.5.1`  or older, follow these steps to migrate to the `analytics-react-native 2.0`. You can continue to use your React Native source write key for the migration to view historical events.

1. Update existing package

```sh
yarn upgrade @segment/analytics-react-native
```

If you are using any device mode destinations from V1 you will have to remove them and add their [equivalent plugin package for V2](#plugins).

2. Add/Update pods
```sh
npx pod-install
```
3. Add permission to `AndroidManifest.xml`
```sh
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Client Configuration

You will have to remove your current configuration and replace it with the `createClient` method. For more information, reference [Setting up the client.](https://github.com/segmentio/analytics-react-native#setting-up-the-client)

**Example client configuration for `analytics-react-native 1.5.1`**

App.js:
```sh
import analytics from '@segment/analytics-react-native'

...

analytics.setup('WRITE_KEY', {
 debug: true,
 using: [amplitude, appsflyer],
 trackAdvertising: true,
});

```
package.json
```sh
"dependencies": {
   ...
  "@segment/analytics-react-native": "1.5.1"
 }
```

podfile.lock
```sh
PODS:
...
 - Analytics (4.1.6)
}
```

**Example client configuration for `analytics-react-native 2.0.0`**
App.tsx (or .js):
```sh
import {
 createClient,
 AnalyticsProvider,
} from '@segment/analytics-react-native';

...

const segmentClient = createClient({
 writeKey: 'WRITE_KEY',
 trackAppLifecycleEvents: true,
});

const App = () => {
 ...
 return (
   <AnalyticsProvider client={segmentClient}>
    ...
   </AnalyticsProvider>
  );
};
```
package.json
```sh
"dependencies": {
  ...
 "nanoid": "^3.1.30",
 "@react-native-async-storage/async-storage": "^1.15.11",
 "@segment/analytics-react-native": "2.0.0"
}
```

podfile.lock
```sh
PODS:
...
- segment-analytics-react-native (2.0.0):
 - React-Core
}
```

### Tracking Implementation

**Example tracking implementation for `analytics-react-native 1.5.1`**

Home.js
```sh
import analytics from '@segment/analytics-react-native';

...

import analytics from '@segment/analytics-react-native';
...
onSendEvent = async() => {
 let name = this.state.eventName
 let properties = this.state.props

 await analytics.track(name, properties);
}
```

**Example tracking implementation for `analytics-react-native 2.0.0`**

Home.tsx
```sh
import { useAnalytics } from '@segment/analytics-react-native';

...

const Home = ({ navigation }: { navigation: any }) => {
  const { screen, track, identify, group, alias, reset, flush } =
    useAnalytics();
    ...
 onPress: () => {
  track('Track pressed', { foo: 'bar' });
 };
 ...
};
```

### Plugins

**The plugins for V2 have changed from V1**. 

The plugins have been re-released with different names. These are the equivalent packages for V2. Not all packages in V1 have yet been released for V2 but Segment is actively adding more packages to the list. 

Also review [the main package list](README.md#supported-plugins) for new V2 plugins.

| Plugin | V1 Package      | V2 Package     |
| ----------- | ----------- | ----------- |
| [Adjust](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-adjust)      | `@segment/analytics-react-native-adjust`|  `@segment/analytics-react-native-plugin-adjust` |
| [Amplitude Sessions](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-amplitudeSession)      | `@segment/analytics-react-native-amplitude`| `@segment/analytics-react-native-plugin-amplitude-session`|
| [AppsFlyer](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-appsflyer)    | `@segment/analytics-react-native-appsflyer` | `@segment/analytics-react-native-plugin-appsflyer`|
| [Facebook App Events](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-facebook-app-events)    | `@segment/analytics-react-native-facebook-app-events-ios` | `@segment/analytics-react-native-plugin-facebook-app-events` |
| [Firebase](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-firebase)      | `@segment/analytics-react-native-firebase` | `@segment/analytics-react-native-plugin-firebase`|
| [Mixpanel](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins/plugin-mixpanel)    | `@segment/analytics-react-native-mixpanel` | `@segment/analytics-react-native-plugin-mixpanel` |
| [Taplytics](https://github.com/taplytics/segment-react-native-plugin-taplytics)     | `@segment/analytics-react-native-taplytics-ios` | `@taplytics/segment-react-native-plugin-taplytics` |

### Context Traits

Previous versions of this library used to persist `traits` accross events after an `identify` was sent inside `context.traits` we're not supporting this out of the box in V2 and the rest of our mobile libraries due concerns of data privacy for some device destinations. Some device mode destinations might not accept events if they contain identifiable data.

If you need to keep this behavior, we have an example plugin [`InjectTraits`](example/src/plugins/InjectTraits.ts) that you can use for it. This plugin injects the current user traits into `context.traits` of every event.

To use it, copy the [file](example/src/plugins/InjectTraits.ts) into your codebase and add it into your client:

```ts
import { createClient } from '@segment/analytics-react-native';

import { InjectTraits } from './InjectTraits';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new InjectTraits() });
```

Please note that as this is an example we don't offer full support for it nor release it as an npm package.