# @segment/analytics-react-native

The hassle-free way to add analytics to your React-Native app.

[![CircleCI](https://circleci.com/gh/segmentio/analytics-react-native.svg?style=svg)](https://circleci.com/gh/segmentio/analytics-react-native) [![codecov](https://codecov.io/gh/segmentio/analytics-react-native/branch/develop/graph/badge.svg)](https://codecov.io/gh/segmentio/analytics-react-native) [![npm](https://img.shields.io/npm/v/@segment/analytics-react-native.svg)](https://www.npmjs.com/package/@segment/analytics-react-native)

<div align="center">
  <img src="https://user-images.githubusercontent.com/16131737/53616046-c141ed80-3b95-11e9-8966-78d4062a44da.png"/>
  <p><b><i>You can't fix what you can't measure</i></b></p>
</div>

Analytics helps you measure your users, product, and business. It unlocks insights into your app's funnel, core business metrics, and whether you have product-market fit.

## How to get started

1. **Collect analytics data** from your app(s).
   - The top 200 Segment companies collect data from 5+ source types (web, mobile, server, CRM, etc.).
2. **Send the data to analytics tools** (for example, Google Analytics, Amplitude, Mixpanel).
   - Over 250+ Segment companies send data to eight categories of destinations such as analytics tools, warehouses, email marketing and remarketing systems, session recording, and more.
3. **Explore your data** by creating metrics (for example, new signups, retention cohorts, and revenue generation).
   - The best Segment companies use retention cohorts to measure product market fit. Netflix has 70% paid retention after 12 months, 30% after 7 years.

[Segment](https://segment.com) collects analytics data and allows you to send it to more than 250 apps (such as Google Analytics, Mixpanel, Optimizely, Facebook Ads, Slack, Sentry) just by flipping a switch. You only need one Segment code snippet, and you can turn destinations on and off from the Segment web UI, with no additional code. [Sign up with Segment today](https://app.segment.com/signup).

### Why?

1. **Power all your analytics apps with the same data**. Instead of writing code to integrate all of your tools individually, send data to Segment, once.

2. **Install tracking for the last time**. We're the last integration you'll ever need to write. You only need to instrument Segment once. Reduce all of your tracking code and advertising tags into a single set of API calls.

3. **Send data from anywhere**. Send Segment data from any device, and we'll transform and send it on to any tool.

4. **Query your data in SQL**. Slice, dice, and analyze your data in detail with Segment SQL. We'll transform and load your customer behavioral data directly from your apps into Amazon Redshift, Google BigQuery, or Postgres. Save weeks of engineering time by not having to invent your own data warehouse and ETL pipeline.

   For example, you can capture data on any app:

   ```js
   analytics.track('Order Completed', { price: 99.84 })
   ```

   Then, query the resulting data in SQL:

   ```sql
   select * from app.order_completed
   order by price desc
   ```

### 🚀 Startup Program

<div align="center">
  <a href="https://segment.com/startups"><img src="https://user-images.githubusercontent.com/16131737/53128952-08d3d400-351b-11e9-9730-7da35adda781.png" /></a>
</div>
If you are part of a new startup  (&lt;$5M raised, &lt;2 years since founding), we just launched a new startup program for you. You can get a Segment Team plan  (up to <b>$25,000 value</b> in Segment credits) for free up to 2 years — <a href="https://segment.com/startups/">apply here</a>!

## Prerequisite

#### React-Native

- Version 0.62 or greater.

#### iOS

- CocoaPods (**recommended**)
  - Don't have CocoaPods setup? Follow [these instructions](https://facebook.github.io/react-native/docs/integration-with-existing-apps#configuring-cocoapods-dependencies).
- or [manually install `Analytics`](#ios-support-without-cocoapods)

## Installation

```bash
$ yarn add @segment/analytics-react-native
$ cd ios && pod install && cd .. # CocoaPods on iOS needs this extra step
```

## Usage

See the [API docs](packages/core/docs/classes/analytics.client.md) for more details.

Additional examples of common usage patterns and how-to's can found at [Analytics for React-Native](https://segment.com/docs/connections/sources/catalog/libraries/mobile/react-native/).

<!-- prettier-ignore -->
```js
import analytics from '@segment/analytics-react-native'
import mixpanel from '@segment/analytics-react-native-mixpanel'
import firebase from '@segment/analytics-react-native-firebase'

analytics
    .setup('writeKey', {
        using: [mixpanel, firebase],
        recordScreenViews: true,
        trackAppLifecycleEvents: true,

        android: {
            flushInterval: 60000, // 60 seconds
            collectDeviceId: true
        },
        ios: {
            trackAdvertising: true,
            trackDeepLinks: true
        }
    })
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
2.  [Directly from the device using bundled SDK’s](#packaging-device-mode-destination-sdks)

**Note**: Refer to the specific destination’s docs to see if your tool must be bundled in the app or sent server-side.

#### Cloud-based Connection Modes

When an destination’s SDK is not packaged, but it is enabled using the Segment web UI, the request goes through the Segment REST API, and is routed to the service’s server-side API as [described here](https://segment.com/docs/connections/destinations/#connection-modes).

#### Packaging Device-mode Destination SDKs

By default, our `@segment/analytics-react-native` package does not contain any device-based destinations.

We recommend only using device-based destinations on a need-to-use basis to reduce the size of your application, and to avoid running into the dreaded 65k method limit on Android.

If you would like to package device-based destinations, first search for the dependency you need using [the list below](#supported-device-mode-destinations).
Then run `pod install` in your `ios/` folder and add it in the `.using()` configuration method. Example using Firebase :

```bash
$ yarn add @segment/analytics-react-native-firebase
$ cd ios && pod install && cd ..
```

In your code :

```js
import analytics from '@segment/analytics-react-native'
import firebase from '@segment/analytics-react-native-firebase'

await analytics.setup('writeKey', {
  using: [firebase]
})
```

For IOS you must add the GoogleService-info.plist to your iOS folder. This file can be downloaded from your Firebase instance. Firebase takes up to 24 hours to show events. However, you can utilize the Firebase debug method to confirm your setup is sending data correctly. To do this add `-FIRDebugEnabled` in Xcode’s Scheme Settings.

In Xcode:
`Project -> Scheme -> Edit Scheme -> Arguments Passed On Launch`

#### Supported Device-Mode Destinations

> All destinations have the same version as `@segment/analytics-react-native`

**Note**: Each device-mode destination has a different native setup procedure due to differences between the underlying SDK vendors. Please refer to the vendor documentation for configuring the native iOS and Android portions of a given destination. More information and links to vendor specific instructions and details can be found at [Connection Mode Comparisons](https://segment.com/docs/connections/destinations/cmodes-compare/).

<!-- AUTOGEN:INTEGRATIONS:BEGIN -->

| Name                                                                                                         | iOS                | Android            | npm package                                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------ | ------------------ | --------------------------------------------------------- |
| [Adjust](https://www.npmjs.com/package/@segment/analytics-react-native-adjust)                               | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-adjust`                  |
| [Amplitude](https://www.npmjs.com/package/@segment/analytics-react-native-amplitude)                         | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-amplitude`               |
| [Appboy](https://www.npmjs.com/package/@segment/analytics-react-native-appboy)                               | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-appboy`                  |
| [AppsFlyer](https://www.npmjs.com/package/@segment/analytics-react-native-appsflyer)                         | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-appsflyer`               |
| [Branch](https://www.npmjs.com/package/@segment/analytics-react-native-branch)                               | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-branch`                  |
| [Bugsnag](https://www.npmjs.com/package/@segment/analytics-react-native-bugsnag)                             | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-bugsnag`                 |
| [CleverTap](https://www.npmjs.com/package/@segment/analytics-react-native-clevertap)                         | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-clevertap`               |
| [ComScore](https://www.npmjs.com/package/@segment/analytics-react-native-comscore-ios)                       | :white_check_mark: | :x:                | `@segment/analytics-react-native-comscore-ios`            |
| [Countly](https://www.npmjs.com/package/@segment/analytics-react-native-countly)                             | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-countly`                 |
| [Crittercism](https://www.npmjs.com/package/@segment/analytics-react-native-crittercism)                     | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-crittercism`             |
| [Facebook App Events](https://www.npmjs.com/package/@segment/analytics-react-native-facebook-app-events-ios) | :white_check_mark: | :x:                | `@segment/analytics-react-native-facebook-app-events-ios` |
| [Firebase](https://www.npmjs.com/package/@segment/analytics-react-native-firebase)                           | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-firebase`                |
| [Flurry](https://www.npmjs.com/package/@segment/analytics-react-native-flurry)                               | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-flurry`                  |
| [Intercom](https://www.npmjs.com/package/@segment/analytics-react-native-intercom)                           | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-intercom`                |
| [Localytics](https://www.npmjs.com/package/@segment/analytics-react-native-localytics)                       | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-localytics`              |
| [Mixpanel](https://www.npmjs.com/package/@segment/analytics-react-native-mixpanel)                           | :white_check_mark: | :white_check_mark: | `@segment/analytics-react-native-mixpanel`                |
| [Quantcast](https://www.npmjs.com/package/@segment/analytics-react-native-quantcast-android)                 | :x:                | :white_check_mark: | `@segment/analytics-react-native-quantcast-android`       |
| [Taplytics](https://www.npmjs.com/package/@segment/analytics-react-native-taplytics-ios)                     | :white_check_mark: | :x:                | `@segment/analytics-react-native-taplytics-ios`           |
| [Tapstream](https://www.npmjs.com/package/@segment/analytics-react-native-tapstream-android)                 | :x:                | :white_check_mark: | `@segment/analytics-react-native-tapstream-android`       |

<!-- AUTOGEN:INTEGRATIONS:END -->

## Troubleshooting

### iOS support without CocoaPods

<!-- Based on https://segment.com/docs/sources/mobile/ios/#dynamic-framework-for-manual-installation -->

We **highly recommend** using Cocoapods.

However, if you cannot use Cocoapods, you can manually install our dynamic framework allowing you to send data to Segment and on to enabled cloud-mode destinations. We do not support sending data to bundled, device-mode destinations outside of Cocoapods.

Here are the steps for installing manually:

1. Add `analytics-ios` as a npm dependency: `yarn add @segment/analytics-ios@github:segmentio/analytics-ios#3.6.10`
2. In the `General` tab for your project, search for `Embedded Binaries` and add the `Analytics.framework`
   ![Embed Analytics.framework](https://segment.com/docs/sources/mobile/react-native/images/embed-analytics-framework.png)

Please note, if you are choosing to not use a dependency manager, you must keep files up-to-date with regularly scheduled, manual updates.

### "Failed to load [...] native module"

If you're getting a `Failed to load [...] native module` error, it means that some native code hasn't been injected to your native project.

#### iOS

If you're using Cocoapods, check that your `ios/Podfile` file contains the right pods :

- `Failed to load Analytics native module`, look for the core native module:
  ```ruby
  pod 'RNAnalytics', :path => '../node_modules/@segment/analytics-react-native'
  ```
- `Failed to load [...] integration native module`, look for the destination native module, example with Google Analytics:
  ```ruby
  pod 'RNAnalyticsIntegration-Google-Analytics', :path => '../node_modules/@segment/analytics-react-native-google-analytics'
  ```

Also check that your `Podfile` is synchronized with your workspace, run `pod install` in your `ios` folder.

If you're not using Cocoapods please check that you followed the [iOS support without CocoaPods](#ios-support-without-cocoapods) instructions carefully.

#### Android

Check that `android/app/src/main/.../MainApplication.java` contains a reference to the native module:

- `Failed to load Analytics native module`, look for the core native module:

  ```java
  import com.segment.analytics.reactnative.core.RNAnalyticsPackage;

  // ...

  @Override
  protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
          // ...
          new RNAnalyticsPackage()
      );
  }
  ```

- `Failed to load [...] integration native module`, look for the destination native module, example with Google Analytics:

  ```java
  import com.segment.analytics.reactnative.integration.google.analytics.RNAnalyticsIntegration_Google_AnalyticsPackage;

  // ...

  @Override
  protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
          // ...
          new RNAnalyticsIntegration_Google_AnalyticsPackage()
      );
  }
  ```
