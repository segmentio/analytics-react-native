# @segment/analytics-react-native-plugin-destination-filters

Plugin for adding support for [Destination Filters](https://segment.com/docs/connections/destinations/destination-filters/) to your React Native application.

## Installation

You will need to install the `@segment/analytics-react-native-plugin-destination-filters` package as a dependency in your project:

Using NPM:

```bash
npm install --save @segment/analytics-react-native-plugin-destination-filters
```

Using Yarn:

```bash
yarn add @segment/analytics-react-native-plugin-destination-filters
```

## Usage

Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

After you create your segment client add `DestinationFiltersPlugin` as a plugin, order doesn't matter, this plugin will filter all the other device mode destinations you add before and after this plugin is added:

```ts
import { createClient } from '@segment/analytics-react-native';

import { DestinationFiltersPlugin } from '@segment/analytics-react-native-plugin-destination-filters';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY',
});

segmentClient.add({ plugin: new DestinationFiltersPlugin() });
segment.add({ plugin: new FirebasePlugin() });
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
