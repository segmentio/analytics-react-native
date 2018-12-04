[@segment/analytics-react-native](../README.md) > [Configuration](../interfaces/analytics.configuration.md)

# Interface: Configuration

## Hierarchy

**Configuration**

## Index

### Properties

* [android](analytics.configuration.md#android)
* [debug](analytics.configuration.md#debug)
* [flushAt](analytics.configuration.md#flushat)
* [ios](analytics.configuration.md#ios)
* [recordScreenViews](analytics.configuration.md#recordscreenviews)
* [trackAppLifecycleEvents](analytics.configuration.md#trackapplifecycleevents)
* [trackAttributionData](analytics.configuration.md#trackattributiondata)
* [using](analytics.configuration.md#using)

---

## Properties

<a id="android"></a>

### `<Optional>` android

**● android**: * `undefined` &#124; `object`
*

*Defined in analytics.ts:69*

Android specific settings.

___
<a id="debug"></a>

### `<Optional>` debug

**● debug**: * `undefined` &#124; `false` &#124; `true`
*

*Defined in analytics.ts:38*

___
<a id="flushat"></a>

### `<Optional>` flushAt

**● flushAt**: * `undefined` &#124; `number`
*

*Defined in analytics.ts:46*

The number of queued events that the analytics client should flush at. Setting this to `1` will not queue any events and will use more battery.

`20` by default.

___
<a id="ios"></a>

### `<Optional>` ios

**● ios**: * `undefined` &#124; `object`
*

*Defined in analytics.ts:51*

iOS specific settings.

___
<a id="recordscreenviews"></a>

### `<Optional>` recordScreenViews

**● recordScreenViews**: * `undefined` &#124; `false` &#124; `true`
*

*Defined in analytics.ts:17*

Whether the analytics client should automatically track application lifecycle events, such as "Application Installed", "Application Updated" and "Application Opened".

Disabled by default.

___
<a id="trackapplifecycleevents"></a>

### `<Optional>` trackAppLifecycleEvents

**● trackAppLifecycleEvents**: * `undefined` &#124; `false` &#124; `true`
*

*Defined in analytics.ts:26*

Whether the analytics client should automatically make a screen call when a view controller is added to a view hierarchy. Because the iOS underlying implementation uses method swizzling, we recommend initializing the analytics client as early as possible.

Disabled by default.

___
<a id="trackattributiondata"></a>

### `<Optional>` trackAttributionData

**● trackAttributionData**: * `undefined` &#124; `false` &#124; `true`
*

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

