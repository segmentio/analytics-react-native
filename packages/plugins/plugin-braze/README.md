# @segment/analytics-react-native-plugin-braze

`DestinationPlugin` for [Braze](https://www.braze.com). Wraps [`react-native-appboy-sdk`](https://github.com/Appboy/appboy-react-sdk).

## Installation

You need to install the `@segment/analytics-react-native-plugin-braze` and the `react-native-appboy-sdk` dependency.

Using NPM:
```bash
npm install --save @segment/analytics-react-native-plugin-braze react-native-appboy-sdk
```

Using Yarn:
```bash
yarn add @segment/analytics-react-native-plugin-braze react-native-appboy-sdk
```

Run `pod install` after the installation to autolink the Braze SDK.

See [Braze React SDK](https://github.com/Appboy/appboy-react-sdk) for more details of this dependency.

## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `BrazePlugin` instance:

```ts
import { createClient } from '@segment/analytics-react-native';

import { BrazePlugin } from '@segment/analytics-react-native-plugin-braze';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new BrazePlugin() });
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