# @segment/react-native

The hassle-free way to add analytics to your React-Native app.

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/) ![CircleCI](https://img.shields.io/circleci/project/github/segment/analytics-react-native.svg) ![Codecov](https://img.shields.io/codecov/c/github/segment/analytics-react-native.svg) ![npm](https://img.shields.io/npm/v/@segment/react-native.svg)

## Prerequisite

#### Android

- Gradle 4+
- Build Tools 3+

#### iOS

- CocoaPods (**recommended**)
  - [Don't have CocoaPods setup?](#setup-cocoapods-in-an-existing-project)
- or [manually install `Analytics`](#ios-support-without-cocoapods)

## Installation

```bash
$ yarn add @segment/react-native
$ yarn react-native link
```

> All integrations have the same version as `@segment/react-native`

## Usage

See the [API docs](packages/core/docs/classes/analytics.client.md) for more details.

<!-- prettier-ignore -->
```js
import analytics from '@segment/react-native'
import Mixpanel from '@segment/react-native-mixpanel'
import GoogleAnalytics from '@segment/react-native-google-analytics'

analytics
    .configure()
        .using(Mixpanel, GoogleAnalytics)
        .recordScreenViews()
        .trackAppLifecycleEvents()
        .trackAttributionData()
        .ios()
            .recordBluetooth()
            .trackAdvertising()
            .trackDeepLinks()
        .android()
            .disableDevicedId()
    .setup("writeKey")
    .then(() =>
        console.log('Analytics is ready')
    )
    .catch(err =>
        console.error('Something went wrong', err)
    )

analytics.track('Pizza Eaten')
analytics.screen('Home')
```

### Sending data to destinations

<!-- Based on https://segment.com/docs/sources/mobile/android/#sending-data-to-destinations -->

There are two ways to send data to your analytics services through this library:

1.  [Through the Segment servers](#cloud-based-connection-modes)
2.  [Directly from the device using bundled SDK’s](#packaging-device-based-destination-sdks)

**Note**: Refer to the specific destination’s docs to see if your tool must be bundled in the app or sent server-side.

#### Cloud-based Connection Modes

When an destination’s SDK is not packaged, but it is enabled via your dashboard, the request goes through the Segment REST API, and is routed to the service’s server-side API as [described here](https://segment.com/docs/integrations/#connection-modes).

#### Packaging Device-based destination SDKs

By default, our `@segment/react-native` packages does not contain any device-based destinations.

We recommend using device-based destinations on a need-to-use basis to reduce the size of your application, and avoid running into the dreaded 65k method limit on Android.

If you would like to package device-based destinations, first search for the dependency you need using [the list below](#integrations).
You'll need to run `react-native link` and add it in the `.using()` configuration method. Example using Google Analytics :

```bash
$ yarn add @segment/react-native-google-analytics
$ yarn react-native link
```

In your code :

```js
import analytics from '@segment/react-native'
import GoogleAnalytics from '@segment/react-native-google-analytics'

await analytics
  .configure()
  .using(GoogleAnalytics)
  // ...
  .setup('writeKey')
```

#### Integrations

<!-- AUTOGEN:INTEGRATIONS:BEGIN -->

| Name                                                                                               | iOS                | Android            | npm package                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [Adjust](https://www.npmjs.com/package/@segment/react-native-adjust)                               | :white_check_mark: | :white_check_mark: | [`@segment/react-native-adjust`](https://www.npmjs.com/package/@segment/react-native-adjust)                                   |
| [Amplitude](https://www.npmjs.com/package/@segment/react-native-amplitude)                         | :white_check_mark: | :white_check_mark: | [`@segment/react-native-amplitude`](https://www.npmjs.com/package/@segment/react-native-amplitude)                             |
| [Appboy](https://www.npmjs.com/package/@segment/react-native-appboy)                               | :white_check_mark: | :white_check_mark: | [`@segment/react-native-appboy`](https://www.npmjs.com/package/@segment/react-native-appboy)                                   |
| [AppsFlyer](https://www.npmjs.com/package/@segment/react-native-appsflyer)                         | :white_check_mark: | :white_check_mark: | [`@segment/react-native-appsflyer`](https://www.npmjs.com/package/@segment/react-native-appsflyer)                             |
| [Branch](https://www.npmjs.com/package/@segment/react-native-branch)                               | :white_check_mark: | :white_check_mark: | [`@segment/react-native-branch`](https://www.npmjs.com/package/@segment/react-native-branch)                                   |
| [Bugsnag](https://www.npmjs.com/package/@segment/react-native-bugsnag)                             | :white_check_mark: | :white_check_mark: | [`@segment/react-native-bugsnag`](https://www.npmjs.com/package/@segment/react-native-bugsnag)                                 |
| [ComScore](https://www.npmjs.com/package/@segment/react-native-comscore-ios)                       | :white_check_mark: | :x:                | [`@segment/react-native-comscore-ios`](https://www.npmjs.com/package/@segment/react-native-comscore-ios)                       |
| [Countly](https://www.npmjs.com/package/@segment/react-native-countly)                             | :white_check_mark: | :white_check_mark: | [`@segment/react-native-countly`](https://www.npmjs.com/package/@segment/react-native-countly)                                 |
| [Crittercism](https://www.npmjs.com/package/@segment/react-native-crittercism)                     | :white_check_mark: | :white_check_mark: | [`@segment/react-native-crittercism`](https://www.npmjs.com/package/@segment/react-native-crittercism)                         |
| [Facebook App Events](https://www.npmjs.com/package/@segment/react-native-facebook-app-events-ios) | :white_check_mark: | :x:                | [`@segment/react-native-facebook-app-events-ios`](https://www.npmjs.com/package/@segment/react-native-facebook-app-events-ios) |
| [Firebase](https://www.npmjs.com/package/@segment/react-native-firebase)                           | :white_check_mark: | :white_check_mark: | [`@segment/react-native-firebase`](https://www.npmjs.com/package/@segment/react-native-firebase)                               |
| [Flurry](https://www.npmjs.com/package/@segment/react-native-flurry)                               | :white_check_mark: | :white_check_mark: | [`@segment/react-native-flurry`](https://www.npmjs.com/package/@segment/react-native-flurry)                                   |
| [Google Analytics](https://www.npmjs.com/package/@segment/react-native-google-analytics)           | :white_check_mark: | :white_check_mark: | [`@segment/react-native-google-analytics`](https://www.npmjs.com/package/@segment/react-native-google-analytics)               |
| [Intercom](https://www.npmjs.com/package/@segment/react-native-intercom)                           | :white_check_mark: | :white_check_mark: | [`@segment/react-native-intercom`](https://www.npmjs.com/package/@segment/react-native-intercom)                               |
| [Localytics](https://www.npmjs.com/package/@segment/react-native-localytics)                       | :white_check_mark: | :white_check_mark: | [`@segment/react-native-localytics`](https://www.npmjs.com/package/@segment/react-native-localytics)                           |
| [Mixpanel](https://www.npmjs.com/package/@segment/react-native-mixpanel)                           | :white_check_mark: | :white_check_mark: | [`@segment/react-native-mixpanel`](https://www.npmjs.com/package/@segment/react-native-mixpanel)                               |
| [Quantcast](https://www.npmjs.com/package/@segment/react-native-quantcast-android)                 | :x:                | :white_check_mark: | [`@segment/react-native-quantcast-android`](https://www.npmjs.com/package/@segment/react-native-quantcast-android)             |
| [Taplytics](https://www.npmjs.com/package/@segment/react-native-taplytics-ios)                     | :white_check_mark: | :x:                | [`@segment/react-native-taplytics-ios`](https://www.npmjs.com/package/@segment/react-native-taplytics-ios)                     |
| [Tapstream](https://www.npmjs.com/package/@segment/react-native-tapstream-android)                 | :x:                | :white_check_mark: | [`@segment/react-native-tapstream-android`](https://www.npmjs.com/package/@segment/react-native-tapstream-android)             |

<!-- AUTOGEN:INTEGRATIONS:END -->

## Troubleshooting

### iOS support without CocoaPods

<!-- Based on https://segment.com/docs/sources/mobile/ios/#dynamic-framework-for-manual-installation -->

We **highly recommend** using Cocoapods.

However, if you cannot use Cocoapods, you can manually install our dynamic framework allowing you to send data to Segment and on to enabled cloud-mode destinations. We do not support sending data to bundled, device-mode integrations outside of Cocoapods.

Here are the steps for installing manually:

1.  Download the [latest built SDK](https://github.com/segmentio/analytics-ios/releases), and unzip the zip file.
2.  Drag the unzipped Analytics.framework folder into your Xcode project.
    Make sure to check `Copy items if needed`.
    ![Add Analytics.framework](docs/ios/add-analytics-framework.png)
3.  In the `General` tab for your project, search for `Embedded Binaries` and add the `Analytics.framework`.
    ![Embed Analytics.framework](docs/ios/embed-analytics-framework.png)

Please note, if you are choosing to not use a dependency manager, you must keep files up-to-date with regularly scheduled, manual updates.

### Setup CocoaPods in an existing project

1.  Check that `ios/Podfile` doesn't exist
2.  `cd ios`
3.  `pod init`
4.  Open `Podfile`
5.  Edit your app `target` to have these `pod` declarations and the `Add new pods below this line` comment :

    ```ruby
    target 'MyReactNativeApp' do
      pod 'React', :path => '../node_modules/react-native'
      pod 'yoga', :path => '../node_modules/react-native/ReactCommon/yoga'

      # Add new pods below this line
    end
    ```

6.  `pod install`
