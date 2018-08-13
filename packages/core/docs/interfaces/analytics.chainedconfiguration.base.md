[@segment/react-native](../README.md) > [ChainedConfiguration](../modules/analytics.chainedconfiguration.md) > [Base](../interfaces/analytics.chainedconfiguration.base.md)

# Interface: Base

## Hierarchy

**Base**

↳  [Configuration](analytics.chainedconfiguration.configuration.md)

↳  [iOS](analytics.chainedconfiguration.ios.md)

↳  [Android](analytics.chainedconfiguration.android.md)

## Index

### Methods

* [android](analytics.chainedconfiguration.base.md#android)
* [ios](analytics.chainedconfiguration.base.md#ios)
* [setup](analytics.chainedconfiguration.base.md#setup)

---

## Methods

<a id="android"></a>

###  android

▸ **android**(): [Android](analytics.chainedconfiguration.android.md)

*Defined in analytics.ts:193*

Access Android specific settings

**Returns:** [Android](analytics.chainedconfiguration.android.md)

___
<a id="ios"></a>

###  ios

▸ **ios**(): [iOS](analytics.chainedconfiguration.ios.md)

*Defined in analytics.ts:189*

Access iOS specific settings

**Returns:** [iOS](analytics.chainedconfiguration.ios.md)

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *[WriteKey](../#writekey)*): `Promise`<[Client](../classes/analytics.client.md)>

*Defined in analytics.ts:185*

Finalize the configuration and initialize the Analytics client.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| writeKey | [WriteKey](../#writekey) |  your Segment.io write key |

**Returns:** `Promise`<[Client](../classes/analytics.client.md)>

___

