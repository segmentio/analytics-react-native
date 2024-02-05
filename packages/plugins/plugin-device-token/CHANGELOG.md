### Dependencies

* **@segment/analytics-react-native:** upgraded to 2.18.0
* **@segment/sovran-react-native:** upgraded to 1.1.0

## [@segment/analytics-react-native-plugin-device-token-v1.0.2](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-device-token-v1.0.1...@segment/analytics-react-native-plugin-device-token-v1.0.2) (2023-06-02)


### Bug Fixes

* fix flush policies reference copy, add BackgroundPolicy ([#838](https://github.com/segmentio/analytics-react-native/issues/838)) ([e4b558a](https://github.com/segmentio/analytics-react-native/commit/e4b558a95e250b1b21d677e08ffeb02a4015bda6))

## [@segment/analytics-react-native-plugin-device-token-v1.0.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-device-token-v1.0.0...@segment/analytics-react-native-plugin-device-token-v1.0.1) (2023-04-18)


### Bug Fixes

* add firebase/messaging to peer deps ([#804](https://github.com/segmentio/analytics-react-native/issues/804)) ([97720ed](https://github.com/segmentio/analytics-react-native/commit/97720edda8d3bbb7a14cd29c7e9c70ea358600e6))
* stricter linting, improved handling of plugin errrors ([#795](https://github.com/segmentio/analytics-react-native/issues/795)) ([1ddb4d5](https://github.com/segmentio/analytics-react-native/commit/1ddb4d571df794bc7eaa5c5302ed27b90faf9a73)), closes [#799](https://github.com/segmentio/analytics-react-native/issues/799) [#803](https://github.com/segmentio/analytics-react-native/issues/803) [#802](https://github.com/segmentio/analytics-react-native/issues/802)

## @segment/analytics-react-native-plugin-device-token-v1.0.0 (2023-03-14)


### Features

* add device token plugin ([#777](https://github.com/segmentio/analytics-react-native/issues/777)) ([782a721](https://github.com/segmentio/analytics-react-native/commit/782a721043dcc20bd76b33d4a18e9e5e2ad071d8))

## [@segment/analytics-react-native-plugin-firebase-v0.3.4](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-firebase-v0.3.3...@segment/analytics-react-native-plugin-firebase-v0.3.4) (2023-02-28)


### Bug Fixes

* add logic to convert traits to strings ([#763](https://github.com/segmentio/analytics-react-native/issues/763)) ([559a3bb](https://github.com/segmentio/analytics-react-native/commit/559a3bb70654faee04546b4f18ed6f340d5712db))

## [@segment/analytics-react-native-plugin-firebase-v0.3.3](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-firebase-v0.3.2...@segment/analytics-react-native-plugin-firebase-v0.3.3) (2022-11-30)


### Bug Fixes

* Firebase custom screen properties ([#707](https://github.com/segmentio/analytics-react-native/issues/707)) ([18b75af](https://github.com/segmentio/analytics-react-native/commit/18b75af1bb38246d75ccbfba06d6d972c6db0339))

## [@segment/analytics-react-native-plugin-firebase-v0.3.2](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-firebase-v0.3.1...@segment/analytics-react-native-plugin-firebase-v0.3.2) (2022-10-07)


### Bug Fixes

* avoids calling Firebase setUserId with undefined value ([#676](https://github.com/segmentio/analytics-react-native/issues/676)) ([076848f](https://github.com/segmentio/analytics-react-native/commit/076848f9fffbd9bcf126805b177f4d62029017b2))

## [@segment/analytics-react-native-plugin-firebase-v0.3.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-firebase-v0.3.0...@segment/analytics-react-native-plugin-firebase-v0.3.1) (2022-07-28)


### Bug Fixes

* replace allSettled shim, fix imports from plugins ([#620](https://github.com/segmentio/analytics-react-native/issues/620)) ([18f8ecd](https://github.com/segmentio/analytics-react-native/commit/18f8ecdb291d8c5ecb02e087aa0043df4fc72e97))

## [@segment/analytics-react-native-plugin-firebase-v0.3.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-plugin-firebase-v0.2.1...@segment/analytics-react-native-plugin-firebase-v0.3.0) (2022-07-15)


### Features

* spin off the queue handling into a reusable plugin ([#502](https://github.com/segmentio/analytics-react-native/issues/502)) ([55d7988](https://github.com/segmentio/analytics-react-native/commit/55d798821163d5a41902a6bc099b1bfcbd853a17))


### Bug Fixes

* map to correct firebase event name/attributes ([#596](https://github.com/segmentio/analytics-react-native/issues/596)) ([e21f541](https://github.com/segmentio/analytics-react-native/commit/e21f541725622135cbe5a3d417689325b8a8d2e3))
