# @segment/analytics-react-native-plugin-appsflyer

`DestinationPlugin` for [Appsflyer](https://www.appsflyer.com). Wraps [`react-native-appsflyer`](https://github.com/AppsFlyerSDK/appsflyer-react-native-plugin).

## Installation

You need to install the `@segment/analytics-react-native-plugin-appsflyer` and the `react-native-appsflyer` dependency.

Using NPM:
```bash
npm install --save @segment/analytics-react-native-plugin-appsflyer react-native-appsflyer
```

Using Yarn:
```bash
yarn add @segment/analytics-react-native-plugin-appsflyer react-native-appsflyer
```

Run `pod install` after the installation to autolink the AppsFlyer SDK.

See [AppsFlyer React Native Plugin](https://github.com/AppsFlyerSDK/appsflyer-react-native-plugin) for more details of this dependency.
## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `AppsflyerPlugin` instance. 

```ts
// app.js

import { createClient } from '@segment/analytics-react-native';

import { AppsflyerPlugin } from '@segment/analytics-react-native-plugin-appsflyer';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

const plugin = new AppsflyerPlugin();

segmentClient.add({ plugin });
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