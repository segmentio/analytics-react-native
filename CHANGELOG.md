# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.1.0-beta.1"></a>

# [1.1.0-beta.1](https://github.com/segmentio/analytics-react-native/compare/v1.1.0-beta.0...v1.1.0-beta.1) (2019-07-25)

### Bug Fixes

- **core:** track lifecyle events before builder is set by the singleton ([#88](https://github.com/segmentio/analytics-react-native/pull/88))

<a name="1.1.0-beta.0"></a>

# [1.1.0-beta.0](https://github.com/segmentio/analytics-react-native/compare/v1.0.1-beta.0...v1.1.0-beta.0) (2019-06-20)

### Features

- **integrations:** allow setting integration options ([13b663e](https://github.com/segmentio/analytics-react-native/commit/13b663e))

### Bug Fixes

- **ios:** set trackAdvertising=true by default on ios ([#82](https://github.com/segmentio/analytics-react-native/issues/82)) ([09e997b](https://github.com/segmentio/analytics-react-native/commit/09e997b))

- **android:** fix application lifecycle event tracking (from `1.0.1-beta.0` [#73](https://github.com/segmentio/analytics-react-native/pull/73))

<a name="1.0.1"></a>

## [1.0.1](https://github.com/segmentio/analytics-react-native/compare/v1.0.0...v1.0.1) (2019-06-07)

### Bug Fixes

- **build:** this fixes a release bug in 1.0.0 that omitted any transpiled files in the published version.

Note: This release does not include any of the changes from version `1.0.1-beta.0` (specifically, it does not include the android application lifecycle event tracking bug fix). The changes from `1.0.1-beta.0` will be available in a future release.

<a name="1.0.1-beta.0"></a>

## [1.0.1-beta.0](https://github.com/segmentio/analytics-react-native/compare/v1.0.0...v1.0.1-beta.0) (2019-06-06)

### Bug Fixes

- **android:** fix application lifecycle event tracking ([#73](https://github.com/segmentio/analytics-react-native/pull/73))

<a name="1.0.0"></a>

# [1.0.0](https://github.com/segmentio/analytics-react-native/compare/v0.1.0-beta.0...v1.0.0) (2019-06-05)

Promote pre-release version to a stable release.

Note: This release was published with a bug that omitted transpiled file which makes it unusable. A fix has been published in 1.0.1, and this version has been marked as deprecated.

<a name="0.1.0-beta.0"></a>

## [0.1.0-beta.0](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.5...v0.1.0-beta.0) (2019-04-08)

### Features

- **anonymousid:** add a method to retrieve the anonymousId ([988f382](https://github.com/segmentio/analytics-react-native/commit/988f382))
- **tools:** add stale config ([16a8b20](https://github.com/segmentio/analytics-react-native/commit/16a8b20))

<a name="0.0.1-beta.5"></a>

## [0.0.1-beta.5](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.4...v0.0.1-beta.5) (2019-04-01)

### Bug Fixes

- **android:** fix missing classes at runtime ([#52](https://github.com/segmentio/analytics-react-native/issues/52)) ([bcf19f7](https://github.com/segmentio/analytics-react-native/commit/bcf19f7)), closes [#34](https://github.com/segmentio/analytics-react-native/issues/34) [#35](https://github.com/segmentio/analytics-react-native/issues/35)

<a name="0.0.1-beta.4"></a>

## [0.0.1-beta.4](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.3...v0.0.1-beta.4) (2019-03-29)

### Bug Fixes

- **core:** fix duplicate client error in dev mode ([#51](https://github.com/segmentio/analytics-react-native/issues/51)) ([cb66749](https://github.com/segmentio/analytics-react-native/commit/cb66749)), closes [#16](https://github.com/segmentio/analytics-react-native/issues/16) [#15](https://github.com/segmentio/analytics-react-native/issues/15)
- **core:** React-Native 0.59 Support ([#50](https://github.com/segmentio/analytics-react-native/issues/50)) ([a78c94e](https://github.com/segmentio/analytics-react-native/commit/a78c94e)), closes [#46](https://github.com/segmentio/analytics-react-native/issues/46) [#44](https://github.com/segmentio/analytics-react-native/issues/44)

<a name="0.0.1-beta.3"></a>

## [0.0.1-beta.3](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.2...v0.0.1-beta.3) (2018-12-12)

- Improve iOS support for users without Cocoapods ([#27](https://github.com/segmentio/analytics-react-native/pull/27)) ([e90a58c](https://github.com/segmentio/analytics-react-native/commit/e90a58c)), closes [#17](https://github.com/segmentio/analytics-react-native/issues/17) and [#19](https://github.com/segmentio/analytics-react-native/issues/19)

### BREAKING CHANGES

- We've improved iOS support for non-Cocoapods users. You do not need to follow these steps if you are using Cocoapods.

### Migration instructions

- Remove `Analytics.framework` from your Xcode project
- Remove `Analytics.framework` from `Embedded Binaries`
- Follow [Current instructions](#current-instructions)

### Current instructions

1. Add `analytics-ios` as a npm dependency: `yarn add @segment/analytics-ios@github:segmentio/analytics-ios#3.6.10`
2. In the `General` tab for your project, search for `Embedded Binaries` and add the `Analytics.framework`
   ![Embed Analytics.framework](https://segment.com/docs/sources/mobile/react-native/images/embed-analytics-framework.png)

### Previous instructions

1.  Download the [latest built SDK](https://github.com/segmentio/analytics-ios/releases), and unzip the zip file.
2.  Drag the unzipped Analytics.framework folder into your Xcode project.
    Make sure to check `Copy items if needed`.
    ![Add Analytics.framework](https://segment.com/docs/sources/mobile/react-native/images/add-analytics-framework.png)
3.  In the `General` tab for your project, search for `Embedded Binaries` and add the `Analytics.framework`.
    ![Embed Analytics.framework](https://segment.com/docs/sources/mobile/react-native/images/embed-analytics-framework.png)

<a name="0.0.1-beta.2"></a>

## [0.0.1-beta.2](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.1...v0.0.1-beta.2) (2018-10-24)

### Bug Fixes

- **android:** pull android tool versions from root project ([#12](https://github.com/segmentio/analytics-react-native/issues/12)) ([3f1eb3c](https://github.com/segmentio/analytics-react-native/commit/3f1eb3c)), closes [/github.com/frostney/react-native-create-library/blob/master/templates/android.js#L28](https://github.com//github.com/frostney/react-native-create-library/blob/master/templates/android.js/issues/L28)
- **core:** fix TypeScript typings ([fe7933c](https://github.com/segmentio/analytics-react-native/commit/fe7933c)), closes [#11](https://github.com/segmentio/analytics-react-native/issues/11)

### Features

- **core:** export TypeScript public interfaces ([9978cd7](https://github.com/segmentio/analytics-react-native/commit/9978cd7))

<a name="0.0.1-beta.1"></a>

## [0.0.1-beta.1](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.0...v0.0.1-beta.1) (2018-10-23)

### Bug Fixes

- **bridge:** improve missing native module error ([#5](https://github.com/segmentio/analytics-react-native/issues/5)) ([0a03617](https://github.com/segmentio/analytics-react-native/commit/0a03617))
- **integrations:** fix TypeScript typings ([#8](https://github.com/segmentio/analytics-react-native/issues/8)) ([7535510](https://github.com/segmentio/analytics-react-native/commit/7535510)), closes [#6](https://github.com/segmentio/analytics-react-native/issues/6)

### Features

- **client:** use object-based configuration ([#7](https://github.com/segmentio/analytics-react-native/issues/7)) ([6a281f4](https://github.com/segmentio/analytics-react-native/commit/6a281f4))

### BREAKING CHANGES

- **client:** We've dropped the chained configuration for an object one instead. This will make Analytics blend even better with tools like Prettier.

Before:

```js
analytics
  .configure()
  .using(Mixpanel, GoogleAnalytics)
  .recordScreenViews()
  .trackAppLifecycleEvents()
  .trackAttributionData()
  .android()
  .flushInterval(60)
  .disableDevicedId()
  .ios()
  .trackAdvertising()
  .trackDeepLinks()
  .setup('writeKey')
  .then(() => console.log('Analytics is ready'))
  .catch(err => console.error('Something went wrong', err))
```

Now:

```js
analytics
  .setup('writeKey', {
    using: [Mixpanel, GoogleAnalytics],
    recordScreenViews: true,
    trackAppLifecycleEvents: true,
    trackAttributionData: true,

    android: {
      flushInterval: 60,
      collectDeviceId: false
    },
    ios: {
      trackAdvertising: true,
      trackDeepLinks: true
    }
  })
  .then(() => console.log('Analytics is ready'))
  .catch(err => console.error('Something went wrong', err))
```

<a name="0.0.1-beta.0"></a>

## [0.0.1-beta.0](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-alpha.9...v0.0.1-beta.0) (2018-10-13)

### Bug Fixes

- **integrations:** fix Java unresolved references ([22cc716](https://github.com/segmentio/analytics-react-native/commit/22cc716))
- **test-app:** fix E2E tests ([7aa10f6](https://github.com/segmentio/analytics-react-native/commit/7aa10f6))

<a name="0.0.1-alpha.9"></a>

## [0.0.1-alpha.9](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-alpha.8...v0.0.1-alpha.9) (2018-10-13)
