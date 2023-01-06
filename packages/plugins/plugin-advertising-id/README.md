# @segment/analytics-react-native-plugin-advertising-id

`EnrichmentPlugin` to collect advertisingId on Android

## Installation

Add the package

```sh
yarn add @segment/analytics-react-native-plugin-advertising-id
```

This plugin requires a `compileSdkVersion` of at least 19. 

See [Google Play Services documentation](https://developers.google.com/admob/android/quick-start) for `advertisingId` setup
## Usage

Follow the instructions for adding plugins on the main Analytics client:

In your code where you initialize the Analytics client call the `.add(plugin)` method with an `AdvertisingId` instance

```js
import { createClient } from '@segment/analytics-react-native';
import { AdvertisingIdPlugin } from '@segment/analytics-react-native-plugin-advertising-id';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

//...

segmentClient.add({ plugin: new AdvertisingIdPlugin() });
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
