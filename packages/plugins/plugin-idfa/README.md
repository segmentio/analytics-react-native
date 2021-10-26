# @segment/analytics-react-native-plugin-idfa

`Plugin` which retrieves IDFA data (iOS only). IDFA data will then be included in `event` payloads under `event.context.device`

Please ensure you include the native code in your project:

```sh
yarn add @segment/analytics-react-native-plugin-idfa
# or
# npm install @segment/analytics-react-native-plugin-idfa

npx pod-install
```

You also need to ensure you have a description for `NSUserTrackingUsageDescription` in your `Info.plist`, or your app will crash. Have a look at the /example app in the root of this repo.