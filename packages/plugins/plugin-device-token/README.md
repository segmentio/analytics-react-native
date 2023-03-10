# @segment/analytics-react-native-plugin-device-token

`EnrichmentPlugin` to collect device token values with [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging). This plugin makes it possible to collect Android's FCM and Apple's APNS device tokens. 
## Installation

> warning ""
> This plugin assumes you are using Firebase Cloud Messaging for Android push notifications. If you are strictly using Apple's Push Notification Services, we recommend creating your own enrichment plugin. 

Install the dependencies. 

Using NPM:
```bash
npm install --save @segment/analytics-react-native-plugin-device-token
@react-native-firebase/app @react-native-firebase/messaging
```

Using Yarn:
```bash
yarn add @segment/analytics-react-native-plugin-device-token
@react-native-firebase/app @react-native-firebase/messaging
```

Run `pod install` after the installation to autolink the Firebase SDK.

> warning ""
> Refer to Apple's [Push Notification Services](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns) and [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) for additional setup requirements. 

## Usage 


Follow the [instructions for adding plugins](https://github.com/segmentio/analytics-react-native#adding-plugins) on the main Analytics client:

In your code where you initialize the analytics client call the `.add(plugin)` method with an `DeviceTokenPlugin` instance. 


```ts
import { createClient } from '@segment/analytics-react-native';

import { FirebasePlugin } from '@segment/analytics-react-native-plugin-device-token';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

segmentClient.add({ plugin: new DeviceTokenPlugin() });
```

### updatePermission()

 This plugin only checks to see if permission has been authorized, it does not ask for permissions. You will need to handle permission requests yourself. Once permission has been granted you can call the `updatePermission()` method to begin collecting the device token. 

```ts
import messaging from '@react-native-firebase/messaging';
import { DeviceTokenPlugin } from '@segment/analytics-react-native-plugin-device-token'

const deviceTokenPlugin = new DeviceTokenPlugin()

segmentClient.add({plugin: deviceTokenPlugin })

// handle firebase permissions 
async handlePermission() {
    let permissionStatus = await messaging.requestPermission()

    if (permissionStatus) {
        deviceTokenPlugin.updatePermission()
    }
}
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