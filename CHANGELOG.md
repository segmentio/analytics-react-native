# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.0.1-beta.1"></a>
## [0.0.1-beta.1](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-beta.0...v0.0.1-beta.1) (2018-10-23)


### Bug Fixes

* **bridge:** improve missing native module error ([#5](https://github.com/segmentio/analytics-react-native/issues/5)) ([0a03617](https://github.com/segmentio/analytics-react-native/commit/0a03617))
* **integrations:** fix TypeScript typings ([#8](https://github.com/segmentio/analytics-react-native/issues/8)) ([7535510](https://github.com/segmentio/analytics-react-native/commit/7535510)), closes [#6](https://github.com/segmentio/analytics-react-native/issues/6)


### Features

* **client:** use object-based configuration ([#7](https://github.com/segmentio/analytics-react-native/issues/7)) ([6a281f4](https://github.com/segmentio/analytics-react-native/commit/6a281f4))


### BREAKING CHANGES

* **client:** We've dropped the chained configuration for an object one instead. This will make Analytics blend even better with tools like Prettier.

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
    .setup("writeKey")
    .then(() =>
        console.log('Analytics is ready')
    )
    .catch(err =>
        console.error('Something went wrong', err)
    )
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
    .then(() =>
        console.log('Analytics is ready')
    )
    .catch(err =>
        console.error('Something went wrong', err)
    )
```



<a name="0.0.1-beta.0"></a>

## [0.0.1-beta.0](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-alpha.9...v0.0.1-beta.0) (2018-10-13)

### Bug Fixes

- **integrations:** fix Java unresolved references ([22cc716](https://github.com/segmentio/analytics-react-native/commit/22cc716))
- **test-app:** fix E2E tests ([7aa10f6](https://github.com/segmentio/analytics-react-native/commit/7aa10f6))

<a name="0.0.1-alpha.9"></a>

## [0.0.1-alpha.9](https://github.com/segmentio/analytics-react-native/compare/v0.0.1-alpha.8...v0.0.1-alpha.9) (2018-10-13)
