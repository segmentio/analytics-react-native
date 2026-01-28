# @segment/analytics-react-native-plugin-idfa

`Plugin` which retrieves IDFA data (iOS only). IDFA data will then be included in `event` payloads under `event.context.device`

**This plugin only works on iOS. Android calls will result in no-op.**

## Installation

Using NPM:

```bash
npm install --save @segment/analytics-react-native-plugin-idfa
```

Using Yarn:

```bash
yarn add @segment/analytics-react-native-plugin-idfa
```

You also need to ensure you have a description for `NSUserTrackingUsageDescription` in your `Info.plist`, or your app will crash. Have a look at the /example app in the root of this repo.

## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `IdfaPlugin` instance:

```ts
import { createClient } from '@segment/analytics-react-native';

import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY',
});

segmentClient.add({ plugin: new IdfaPlugin() });
```

You will need to provide a [NSUserTrackingUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/nsusertrackingusagedescription) key in your `Info.plist` file, for why you wish to track IDFA. An IDFA value of `0000...` will be returned on an iOS simulator.

## Customize IDFA Plugin Initialization

To delay the `IDFA Plugin` initialization (ie. to avoid race condition with push notification prompt) implement the following:

```ts
import { createClient } from '@segment/analytics-react-native';

import { IdfaPlugin } from '@segment/analytics-react-native-plugin-idfa';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

...

 /** The IDFA Plugin supports an optional `shouldAskPermission` boolean
 which defaults to true. Setting to false prevents the plugin from
 requesting permission from the user. If you set the parameter to `false` on
 initialization you **must** call `requestTrackingPermission()`
 to retrieve the `idfa`
 */
const idfaPlugin = new IdfaPlugin(false);
segmentClient.add({ plugin: idfaPlugin });


/** `requestTrackingPermission()` will prompt the user for
tracking permission and returns a promise you can use to
make additional tracking decisions based on the response
*/
idfaPlugin.requestTrackingPermission().then((enabled: boolean) => {
  console.log('Tracking Enabled -->', enabled);
});
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
