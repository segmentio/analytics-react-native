[@segment/analytics-react-native](../README.md) > [ChainedConfiguration](../modules/analytics.chainedconfiguration.md) > [Configuration](../interfaces/analytics.chainedconfiguration.configuration.md)

# Interface: Configuration

## Hierarchy

 [Base](analytics.chainedconfiguration.base.md)

**↳ Configuration**

## Index

### Methods

* [android](analytics.chainedconfiguration.configuration.md#android)
* [debug](analytics.chainedconfiguration.configuration.md#debug)
* [flushAt](analytics.chainedconfiguration.configuration.md#flushat)
* [ios](analytics.chainedconfiguration.configuration.md#ios)
* [recordScreenViews](analytics.chainedconfiguration.configuration.md#recordscreenviews)
* [setup](analytics.chainedconfiguration.configuration.md#setup)
* [trackAppLifecycleEvents](analytics.chainedconfiguration.configuration.md#trackapplifecycleevents)
* [trackAttributionData](analytics.chainedconfiguration.configuration.md#trackattributiondata)
* [using](analytics.chainedconfiguration.configuration.md#using)

---

## Methods

<a id="android"></a>

###  android

▸ **android**(): [Android](analytics.chainedconfiguration.android.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[android](analytics.chainedconfiguration.base.md#android)*

*Defined in [analytics.ts:203](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L203)*

Access Android specific settings

**Returns:** [Android](analytics.chainedconfiguration.android.md)

___
<a id="debug"></a>

###  debug

▸ **debug**(): `this`

*Defined in [analytics.ts:233](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L233)*

**Returns:** `this`

___
<a id="flushat"></a>

###  flushAt

▸ **flushAt**(at: *`number`*): `this`

*Defined in [analytics.ts:228](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L228)*

The number of queued events that the analytics client should flush at.

Setting this to `1` will not queue any events and will use more battery. `20` by default.

**Parameters:**

| Param | Type |
| ------ | ------ |
| at | `number` |

**Returns:** `this`

___
<a id="ios"></a>

###  ios

▸ **ios**(): [iOS](analytics.chainedconfiguration.ios.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[ios](analytics.chainedconfiguration.base.md#ios)*

*Defined in [analytics.ts:199](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L199)*

Access iOS specific settings

**Returns:** [iOS](analytics.chainedconfiguration.ios.md)

___
<a id="recordscreenviews"></a>

###  recordScreenViews

▸ **recordScreenViews**(): `this`

*Defined in [analytics.ts:212](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L212)*

Whether the analytics client should automatically make a screen call when a view controller is added to a view hierarchy. Because the iOS underlying implementation uses method swizzling, we recommend initializing the analytics client as early as possible (before any screens are displayed).

**Returns:** `this`

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *[WriteKey](../#writekey)*): `Promise`<[Client](../classes/analytics.client.md)>

*Inherited from [Base](analytics.chainedconfiguration.base.md).[setup](analytics.chainedconfiguration.base.md#setup)*

*Defined in [analytics.ts:195](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L195)*

Finalize the configuration and initialize the Analytics client.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| writeKey | [WriteKey](../#writekey) |  your Segment.io write key |

**Returns:** `Promise`<[Client](../classes/analytics.client.md)>

___
<a id="trackapplifecycleevents"></a>

###  trackAppLifecycleEvents

▸ **trackAppLifecycleEvents**(): `this`

*Defined in [analytics.ts:217](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L217)*

Enable the automatic tracking of application lifecycle events, such as "Application Installed", "Application Updated" and "Application Opened".

**Returns:** `this`

___
<a id="trackattributiondata"></a>

###  trackAttributionData

▸ **trackAttributionData**(): `this`

*Defined in [analytics.ts:221](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L221)*

Whether the analytics client should automatically track attribution data from enabled providers using the mobile service.

**Returns:** `this`

___
<a id="using"></a>

###  using

▸ **using**(...integrations: *[Integration](../#integration)[]*): `this`

*Defined in [analytics.ts:232](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L232)*

Register a set of integrations to be used with this Analytics instance.

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Rest` integrations | [Integration](../#integration)[] |

**Returns:** `this`

___

