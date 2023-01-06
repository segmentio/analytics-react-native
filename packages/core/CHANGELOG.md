## [@segment/analytics-react-native-v2.10.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.9.1...@segment/analytics-react-native-v2.10.0) (2022-11-30)


### Features

* add Flush Policies ([#703](https://github.com/segmentio/analytics-react-native/issues/703)) ([004b596](https://github.com/segmentio/analytics-react-native/commit/004b59659453b8d610b32e5e202033e190abbaee))
* added errorHandler option to client ([#713](https://github.com/segmentio/analytics-react-native/issues/713)) ([b95788b](https://github.com/segmentio/analytics-react-native/commit/b95788ba8ecb547ffc9f43ba94f628c25f3660d1))


### Bug Fixes

* add segmentDestination plugin to exports ([#712](https://github.com/segmentio/analytics-react-native/issues/712)) ([d47ceb1](https://github.com/segmentio/analytics-react-native/commit/d47ceb1ea1934fa68e5f8c939c51345dee88fdcb))
* Firebase custom screen properties ([#707](https://github.com/segmentio/analytics-react-native/issues/707)) ([18b75af](https://github.com/segmentio/analytics-react-native/commit/18b75af1bb38246d75ccbfba06d6d972c6db0339))
* replace native modules with react-native-uuid ([#718](https://github.com/segmentio/analytics-react-native/issues/718)) ([db38836](https://github.com/segmentio/analytics-react-native/commit/db38836befcbddee01abd9ee7381c45e04f83dba))

## [@segment/analytics-react-native-v2.9.1](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.9.0...@segment/analytics-react-native-v2.9.1) (2022-11-01)


### Bug Fixes

* memoize useAnalytics ([#693](https://github.com/segmentio/analytics-react-native/issues/693)) ([e4b27b4](https://github.com/segmentio/analytics-react-native/commit/e4b27b4a1bff8bd0c4e542a8fdfbffb84b9c746b))
* remove special anonymousID behaviour on dev mode ([#700](https://github.com/segmentio/analytics-react-native/issues/700)) ([c3e41ea](https://github.com/segmentio/analytics-react-native/commit/c3e41ead9de261bd3232305444eccd824294acc7))
* upgrade sovran to v0.4.5, adds shortcircuit for ExpoGo Testing ([#697](https://github.com/segmentio/analytics-react-native/issues/697)) ([c348023](https://github.com/segmentio/analytics-react-native/commit/c348023ded65d7f08d86a7925c0b49770cf759a5))

## [@segment/analytics-react-native-v2.9.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.8.0...@segment/analytics-react-native-v2.9.0) (2022-10-07)


### Features

* destination filter support for device mode plugins ([#685](https://github.com/segmentio/analytics-react-native/issues/685)) ([3cfa8b9](https://github.com/segmentio/analytics-react-native/commit/3cfa8b953eb1ae66f519b16fc4ed43a527586832))
* short-circuit and throw warnings when missing native modules ([#680](https://github.com/segmentio/analytics-react-native/issues/680)) ([bed01c1](https://github.com/segmentio/analytics-react-native/commit/bed01c10c0e452c9f24f76831f7e932837ff50bd))


### Bug Fixes

* default integrations settings are set properly when unable to fetch ([#684](https://github.com/segmentio/analytics-react-native/issues/684)) ([0627deb](https://github.com/segmentio/analytics-react-native/commit/0627deb66ae16d44dc97eeb51853c8abd98cceec))

## [@segment/analytics-react-native-v2.8.0](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.7.2...@segment/analytics-react-native-v2.8.0) (2022-09-13)


### Features

* adds option to provide a custom logger object to consume library logs ([#670](https://github.com/segmentio/analytics-react-native/issues/670)) ([d40a315](https://github.com/segmentio/analytics-react-native/commit/d40a315e380cf2ce7a1f7805b85893b6370fbe6f))


### Bug Fixes

* update kotlin version in adId plugin to resolve build errors ([#668](https://github.com/segmentio/analytics-react-native/issues/668)) ([3f51c58](https://github.com/segmentio/analytics-react-native/commit/3f51c58540d893350028f2a118f19c30bc543af7))

## [@segment/analytics-react-native-v2.7.2](https://github.com/segmentio/analytics-react-native/compare/@segment/analytics-react-native-v2.7.1...@segment/analytics-react-native-v2.7.2) (2022-09-07)


### Bug Fixes

* apply userInfo on processing to prevent concurrency issues ([#660](https://github.com/segmentio/analytics-react-native/issues/660)) ([4f60a84](https://github.com/segmentio/analytics-react-native/commit/4f60a84918e8f9a0bb3e8e5fbdb2412f23048f94))

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
