# @segment/analytics-react-native-plugin-firebase

`DestinationPlugin` for [Firebase](https://firebase.google.com). Wraps [`react-native-firebase`](https://github.com/invertase/react-native-firebase).

## Installation

You need to install the `@segment/analytics-react-native-plugin-firebase` and its dependencies: `@react-native-firebase/app` and `@react-native-firebase/analytics`

Using NPM:
```bash
npm install --save @segment/analytics-react-native-plugin-firebase @react-native-firebase/app @react-native-firebase/analytics
```

Using Yarn:
```bash
yarn add @segment/analytics-react-native-plugin-firebase @react-native-firebase/app @react-native-firebase/analytics
```

Run `pod install` after the installation to autolink the Firebase SDK.

See [React Native Firebase](https://rnfirebase.io) and [React Native Firebase Analytics](https://rnfirebase.io/analytics/usage) for more details of Firebase packages.

## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `FirebasePlugin` instance. 

```ts
import { createClient } from '@segment/analytics-react-native';

import { FirebasePlugin } from '@segment/analytics-react-native-plugin-firebase';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new FirebasePlugin() });
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