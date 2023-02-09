# @segment/analytics-react-native-plugin-mixpanel

`DestinationPlugin` for [CleverTap](https://https://clevertap.com/). Wraps [`mixpanel-react-native`](https://github.com/CleverTap/clevertap-react-native).

## Installation

You need to install the `@segment/analytics-react-native-plugin-clevertap` and the `clevertap-react-native` dependency.

Using NPM:
```bash
npm install --save @segment/analytics-react-native-plugin-clevertap clevertap-react-native
```

Using Yarn:
```bash
yarn add @segment/analytics-react-native-plugin-clevertap clevertap-react-native
```

Run `pod install` after the installation to autolink the Clevertap SDK.

See [CleverTap React Native SDK](https://github.com/CleverTap/clevertap-react-native/blob/master/docs/install.md) for more details of this dependency.
## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `ClevertapPlugin` instance:

```ts
import { createClient } from '@segment/analytics-react-native';

import { ClevertapPlugin } from '@segment/analytics-react-native-plugin-clevertap';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new ClevertapPlugin() });
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
