[@segment/analytics-react-native](../README.md) > [ChainedConfiguration](../modules/analytics.chainedconfiguration.md) > [iOS](../interfaces/analytics.chainedconfiguration.ios.md)

# Interface: iOS

## Hierarchy

 [Base](analytics.chainedconfiguration.base.md)

**↳ iOS**

## Index

### Methods

* [android](analytics.chainedconfiguration.ios.md#android)
* [ios](analytics.chainedconfiguration.ios.md#ios)
* [setup](analytics.chainedconfiguration.ios.md#setup)
* [trackAdvertising](analytics.chainedconfiguration.ios.md#trackadvertising)
* [trackDeepLinks](analytics.chainedconfiguration.ios.md#trackdeeplinks)

---

## Methods

<a id="android"></a>

###  android

▸ **android**(): [Android](analytics.chainedconfiguration.android.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[android](analytics.chainedconfiguration.base.md#android)*

*Defined in analytics.ts:202*

Access Android specific settings

**Returns:** [Android](analytics.chainedconfiguration.android.md)

___
<a id="ios"></a>

###  ios

▸ **ios**(): [iOS](analytics.chainedconfiguration.ios.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[ios](analytics.chainedconfiguration.base.md#ios)*

*Defined in analytics.ts:198*

Access iOS specific settings

**Returns:** [iOS](analytics.chainedconfiguration.ios.md)

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *[WriteKey](../#writekey)*): `Promise`<[Client](../classes/analytics.client.md)>

*Inherited from [Base](analytics.chainedconfiguration.base.md).[setup](analytics.chainedconfiguration.base.md#setup)*

*Defined in analytics.ts:194*

Finalize the configuration and initialize the Analytics client.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| writeKey | [WriteKey](../#writekey) |  your Segment.io write key |

**Returns:** `Promise`<[Client](../classes/analytics.client.md)>

___
<a id="trackadvertising"></a>

###  trackAdvertising

▸ **trackAdvertising**(): `this`

*Defined in analytics.ts:239*

Whether the analytics client should track advertisting info.

**Returns:** `this`

___
<a id="trackdeeplinks"></a>

###  trackDeepLinks

▸ **trackDeepLinks**(): `this`

*Defined in analytics.ts:245*

Whether the analytics client should automatically track deep links.

You'll still need to call the continueUserActivity and openURL methods on the analytics client.

**Returns:** `this`

___

