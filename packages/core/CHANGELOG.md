## [@segment/analytics-react-native-v2.7.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.7.0...@segment/analytics-react-native-v2.7.1) (2022-08-24)


### Bug Fixes

* bump kotlin version ([#652](https://github.com/segmentio/analytics-react-native/issues/652)) ([3746738](https://github.com/segmentio/analytics-react-native/commit/37467383935b5293a89f20398c4dfd8f08ebf610))
* do not attempt to cast null as ReactApplication ([#651](https://github.com/segmentio/analytics-react-native/issues/651)) ([7697587](https://github.com/segmentio/analytics-react-native/commit/7697587186ef4a7e7fe242c557d14a8249275b42))

## [@segment/analytics-react-native-v2.7.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.6.0...@segment/analytics-react-native-v2.7.0) (2022-08-10)


### Features

* prepare advertising-id for release ([#640](https://github.com/segmentio/analytics-react-native/issues/640)) ([0f2b5aa](https://github.com/segmentio/analytics-react-native/commit/0f2b5aaf77829e32399d91b3aab38081699beecf))

## [@segment/analytics-react-native-v2.6.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.5.1...@segment/analytics-react-native-v2.6.0) (2022-08-10)


### Features

* prepare for release ([#627](https://github.com/segmentio/analytics-react-native/issues/627)) ([68d69ae](https://github.com/segmentio/analytics-react-native/commit/68d69aec143777b3444f256b4cb16f6913440dca))


### Bug Fixes

* fix device.id logic to prevent random ids ([#637](https://github.com/segmentio/analytics-react-native/issues/637)) ([d8f1d39](https://github.com/segmentio/analytics-react-native/commit/d8f1d39fe169d3d6dcfe9ff8b9b8c90f69ffe281))

## [@segment/analytics-react-native-v2.5.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.5.0...@segment/analytics-react-native-v2.5.1) (2022-07-28)


### Bug Fixes

* replace allSettled shim, fix imports from plugins ([#620](https://github.com/segmentio/analytics-react-native/issues/620)) ([18f8ecd](https://github.com/segmentio/analytics-react-native/commit/18f8ecdb291d8c5ecb02e087aa0043df4fc72e97))

## [@segment/analytics-react-native-v2.5.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.4.0...@segment/analytics-react-native-v2.5.0) (2022-07-27)


### Features

* update react native in example to 0.69.2 ([#613](https://github.com/segmentio/analytics-react-native/issues/613)) ([d9e7967](https://github.com/segmentio/analytics-react-native/commit/d9e79672fcd1ec49603bc87e0fdf1efbd2504d68))


### Bug Fixes

* race condition when using state changing events ([#611](https://github.com/segmentio/analytics-react-native/issues/611)) ([40ede04](https://github.com/segmentio/analytics-react-native/commit/40ede04ce465eef03816185e5a1d3a58f1d8b8a9))

## [@segment/analytics-react-native-v2.4.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.3.2...@segment/analytics-react-native-v2.4.0) (2022-07-15)


### Features

* spin off the queue handling into a reusable plugin ([#502](https://github.com/segmentio/analytics-react-native/issues/502)) ([55d7988](https://github.com/segmentio/analytics-react-native/commit/55d798821163d5a41902a6bc099b1bfcbd853a17))
* support max kB in upload batching ([#600](https://github.com/segmentio/analytics-react-native/issues/600)) ([3dc1957](https://github.com/segmentio/analytics-react-native/commit/3dc1957607451591efe43c27ac65786d5dfdc7b1))


### Bug Fixes

* add export for SegmentClient ([#606](https://github.com/segmentio/analytics-react-native/issues/606)) ([ff094f5](https://github.com/segmentio/analytics-react-native/commit/ff094f56237f426381effdca7604cb61ceeaf6d6))
* timeline safe processing events for destinations ([#604](https://github.com/segmentio/analytics-react-native/issues/604)) ([78dcd0e](https://github.com/segmentio/analytics-react-native/commit/78dcd0e67ad1ba84cc92b2fb8cc6163fe6bef16d))
* use storePersistor option in QueueFlushingPlugin ([#602](https://github.com/segmentio/analytics-react-native/issues/602)) ([f7be269](https://github.com/segmentio/analytics-react-native/commit/f7be269e01699f035772b1caba2c4aeae3939ae8))

## [@segment/analytics-react-native-v2.3.2](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.3.1...@segment/analytics-react-native-v2.3.2) (2022-06-30)


### Features

* Add AdvertisingId Plugin ([#574](https://github.com/segmentio/analytics-react-native/issues/574)) ([9f47e67](https://github.com/segmentio/analytics-react-native/commit/9f47e67906c658519e13c022a19c3f4640622ad6))


### Bug Fixes

* revert traits behavior ([#588](https://github.com/segmentio/analytics-react-native/issues/588)) ([516aacd](https://github.com/segmentio/analytics-react-native/commit/516aacdd8ddc03367ae53a8ba01be689a450ffc9))

## [@segment/analytics-react-native-v2.3.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.3.0...@segment/analytics-react-native-v2.3.1) (2022-06-24)


### Bug Fixes

* persist user traits across events ([#581](https://github.com/segmentio/analytics-react-native/issues/581)) ([d48ac83](https://github.com/segmentio/analytics-react-native/commit/d48ac834000a4a81524b30ec1e386f337d55adf2))
