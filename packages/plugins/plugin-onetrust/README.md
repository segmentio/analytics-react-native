# @segment/analytics-react-native-plugin-onetrust

Plugin for adding support for [OneTrust](https://onetrust.com/) CMP to your React Native application.

⚠️ The SDK version used must match the version of the JSON published from your OneTrust instance. This Provider was built using `202308.2.0`. This is not a "plugin" as defined by the SDK's [plugin-timeline architecture](https://github.com/segmentio/analytics-react-native/tree/master?tab=readme-ov-file#plugins--timeline-architecture). Instead, it must be used with the `ConsentPlugin` included in the core SDK. This is deliberate as it is impossible to support every possible version of the OneTrust SDK. Therefore, the `OneTrustConsentProvider` should serve as a reference/example for users on a different version. 

## Installation

You will need to install the `@segment/analytics-react-native-plugin-onetrust` package as a dependency in your project:

Using NPM:

```bash
npm install --save @segment/analytics-react-native-plugin-onetrust react-native-onetrust-cmp
```

Using Yarn:

```bash
yarn add @segment/analytics-react-native-plugin-onetrust react-native-onetrust-cmp
```

## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

After you create your segment client there are a few steps you must follow to complete your One Trust integration.

1. Initialize the `OneTrust` SDK:

```ts
import OTPublishersNativeSDK from 'react-native-onetrust-cmp';

...

OTPublishersNativeSDK.startSDK(
  'storageLocation',
  'domainIdentifier',
  'languageCode',
  {countryCode: 'us', regionCode:'ca'},
  true,
)
  .then((responseObject) => {
    console.info('Download status is ' + responseObject.status);
    // get full JSON object from responseObject.responseString
  })
  .catch((error) => {
    console.error(`OneTrust download failed with error ${error}`);
  });
```

2. Create a new `OneTrustConsentProvider` and pass the `OneTrust` SDK to it: 

```ts
import { createClient, ConsentPlugin } from '@segment/analytics-react-native';
import OTPublishersNativeSDK from 'react-native-onetrust-cmp';
import { OTCategoryConsentProvider } from '@segment/analytics-react-native-plugin-onetrust'

...

 const oneTrustProvider = new OneTrustConsentProvider(OTPublisherNativeSDK)
```

3. Initialize a new `ConsentPlugin` and pass the `OneTrustConsentProvider` to it: 

```ts
import OTPublishersNativeSDK from 'react-native-onetrust-cmp';
import { OneTrustConsentProvider  } from '@segment/analytics-react-native-plugin-onetrust'

...

const oneTrustProvider = new OneTrustConsentProvider(OTPublisherNativeSDK)
const OneTrustPlugin = new ConsentPlugin(oneTrustProvider);
```

4. Add `OneTrustPlugin` as a plugin, order doesn't matter, this plugin will apply to all device mode destinations you add before and after this plugin is added. Full example below:

```ts
import { createClient, ConsentPlugin} from '@segment/analytics-react-native';
import { OneTrustConsentProvider } from '@segment/analytics-react-native-plugin-onetrust';
import OTPublishersNativeSDK from 'react-native-onetrust-cmp';

OTPublishersNativeSDK.startSDK(
  'storageLocation',
  'domainIdentifier',
  'languageCode',
  {countryCode: 'us', regionCode:'ca'},
  true,
)
  .then((responseObject) => {
    console.info('Download status is ' + responseObject.status);
    // get full JSON object from responseObject.responseString
  })
  .catch((error) => {
    console.error(`OneTrust download failed with error ${error}`);
  });

const segment = createClient({
  writeKey: 'SEGMENT_KEY',
});


const oneTrustProvider = new OneTrustConsentProvider(OTPublisherNativeSDK)
const oneTrustPlugin = new ConsentPlugin(oneTrustProvider);

segment.add({ plugin: oneTrustPlugin });

// device mode destinations
segment.add({ plugin: new BrazePlugin() });
```

## Support

Please use Github issues, Pull Requests, or feel free to reach out to our [support team](https://segment.com/help/).

## Integrating with Segment

Interested in integrating your service with us? Check out our [Partners page](https://segment.com/partners/) for more details.

## License

```
MIT License

Copyright (c) 2021 Segment

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
