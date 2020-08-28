[@segment/analytics-react-native](../README.md) > [Configuration](../interfaces/analytics.configuration.md)

# Interface: Configuration

## Hierarchy

**Configuration**

## Index

### Properties

* [android](analytics.configuration.md#android)
* [debug](analytics.configuration.md#debug)
* [defaultProjectSettings](analytics.configuration.md#defaultprojectsettings)
* [flushAt](analytics.configuration.md#flushat)
* [ios](analytics.configuration.md#ios)
* [proxy](analytics.configuration.md#proxy)
* [recordScreenViews](analytics.configuration.md#recordscreenviews)
* [trackAppLifecycleEvents](analytics.configuration.md#trackapplifecycleevents)
* [trackAttributionData](analytics.configuration.md#trackattributiondata)
* [using](analytics.configuration.md#using)

---

## Properties

<a id="android"></a>

### `<Optional>` android

**● android**: *`undefined` \| `object`*

*Defined in analytics.ts:120*

Android specific settings.

___
<a id="debug"></a>

### `<Optional>` debug

**● debug**: *`undefined` \| `false` \| `true`*

*Defined in analytics.ts:38*

___
<a id="defaultprojectsettings"></a>

### `<Optional>` defaultProjectSettings

**● defaultProjectSettings**: *`undefined` \| `object`*

*Defined in analytics.ts:46*

Default project settings to use, if Segment.com cannot be reached. An example configuration can be found here, using your write key: [](https://cdn-settings.segment.com/v1/projects/YOUR_WRITE_KEY/settings)[https://cdn-settings.segment.com/v1/projects/YOUR\_WRITE\_KEY/settings](https://cdn-settings.segment.com/v1/projects/YOUR_WRITE_KEY/settings)

___
<a id="flushat"></a>

### `<Optional>` flushAt

**● flushAt**: *`undefined` \| `number`*

*Defined in analytics.ts:54*

The number of queued events that the analytics client should flush at. Setting this to `1` will not queue any events and will use more battery.

`20` by default.

___
<a id="ios"></a>

### `<Optional>` ios

**● ios**: *`undefined` \| `object`*

*Defined in analytics.ts:102*

iOS specific settings.

___
<a id="proxy"></a>

### `<Optional>` proxy

**● proxy**: *`undefined` \| `object`*

*Defined in analytics.ts:72*

Whether the analytics client should send all requests through your own hosted proxy rather than directly to Segment. See: iOS: [https://segment.com/docs/connections/sources/catalog/libraries/mobile/ios/#proxy-http-calls](https://segment.com/docs/connections/sources/catalog/libraries/mobile/ios/#proxy-http-calls) android: [https://segment.com/docs/connections/sources/catalog/libraries/mobile/android/#proxy-http-calls](https://segment.com/docs/connections/sources/catalog/libraries/mobile/android/#proxy-http-calls)

Ex. For a desired proxy through `http://localhost:64000/segment` the configuration would look like such { scheme: 'http', host: 'localhost', port: 64000, path: '/segment' }

___
<a id="recordscreenviews"></a>

### `<Optional>` recordScreenViews

**● recordScreenViews**: *`undefined` \| `false` \| `true`*

*Defined in analytics.ts:19*

Whether the analytics client should automatically make a screen call when a view controller is added to a view hierarchy. Because the iOS underlying implementation uses method swizzling, we recommend initializing the analytics client as early as possible.

Disabled by default.

___
<a id="trackapplifecycleevents"></a>

### `<Optional>` trackAppLifecycleEvents

**● trackAppLifecycleEvents**: *`undefined` \| `false` \| `true`*

*Defined in analytics.ts:26*

Whether the analytics client should automatically track application lifecycle events, such as "Application Installed", "Application Updated" and "Application Opened".

Disabled by default.

___
<a id="trackattributiondata"></a>

### `<Optional>` trackAttributionData

**● trackAttributionData**: *`undefined` \| `false` \| `true`*

*Defined in analytics.ts:32*

Whether the analytics client should automatically track attribution data from enabled providers using the mobile service.

Disabled by default.

___
<a id="using"></a>

### `<Optional>` using

**● using**: *[Integration](../#integration)[]*

*Defined in analytics.ts:37*

Register a set of integrations to be used with this Analytics instance.

___

