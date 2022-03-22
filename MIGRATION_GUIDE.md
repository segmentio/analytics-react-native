# Migrating to 2.0

Analytics-React-Native 2.0 currently supports [these destinations](https://github.com/segmentio/analytics-react-native/tree/master/packages/plugins) with Segment actively adding more to the list. 
If you’re using  `analytics-react-native 1.5.1`  or older, follow these steps to migrate to the `analytics-react-native 2.0`. You can continue to use your React Native source write key for the migration to view historical events.

1. Update existing package

```sh
yarn upgrade @segment/analytics-react-native
```
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
