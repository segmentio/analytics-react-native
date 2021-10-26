# @segment/analytics-react-native-plugin-appsflyer

`DestinationPlugin` for [Appsflyer](https://www.appsflyer.com). Wraps [`react-native-appsflyer`](https://github.com/AppsFlyerSDK/appsflyer-react-native-plugin).

You can provide [additional options](https://github.com/AppsFlyerSDK/appsflyer-react-native-plugin#--initializing-the-sdk) when constructing the plugin. These will be passed to `appsFlyer.initSdk()`.

```js
// app.js

import { createClient } from '@segment/analytics-react-native';

import { AppsflyerPlugin } from '@segment/analytics-react-native-plugin-appsflyer';

const segmentClient = createClient({
  writeKey: 'SEGMENT_KEY'
});

const plugin = new AppsflyerPlugin({
  devKey: 'K2***********99',
  isDebug: false,
  appId: '41*****44',
  onInstallConversionDataListener: true, //Optional
  onDeepLinkListener: true, //Optional
  timeToWaitForATTUserAuthorization: 10 //for iOS 14.5
})

segmentClient.add({ plugin });

```