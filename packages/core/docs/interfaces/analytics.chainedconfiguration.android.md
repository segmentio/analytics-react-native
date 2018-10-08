[@segment/analytics-react-native](../README.md) > [ChainedConfiguration](../modules/analytics.chainedconfiguration.md) > [Android](../interfaces/analytics.chainedconfiguration.android.md)

# Interface: Android

## Hierarchy

 [Base](analytics.chainedconfiguration.base.md)

**↳ Android**

## Index

### Methods

* [android](analytics.chainedconfiguration.android.md#android)
* [disableDeviceId](analytics.chainedconfiguration.android.md#disabledeviceid)
* [flushInterval](analytics.chainedconfiguration.android.md#flushinterval)
* [ios](analytics.chainedconfiguration.android.md#ios)
* [setup](analytics.chainedconfiguration.android.md#setup)

---

## Methods

<a id="android"></a>

###  android

▸ **android**(): [Android](analytics.chainedconfiguration.android.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[android](analytics.chainedconfiguration.base.md#android)*

*Defined in analytics.ts:251*

Access Android specific settings

**Returns:** [Android](analytics.chainedconfiguration.android.md)

___
<a id="disabledeviceid"></a>

###  disableDeviceId

▸ **disableDeviceId**(): `this`

*Defined in analytics.ts:305*

Disable the collection of the device identifier. Enabled by default.

The device identifier is obtained using :

*   `android.provider.Settings.Secure.ANDROID_ID`
*   `android.os.Build.SERIAL`
*   or Telephony Identifier retrieved via TelephonyManager as available

**Returns:** `this`

___
<a id="flushinterval"></a>

###  flushInterval

▸ **flushInterval**(every: *`number`*): `this`

*Defined in analytics.ts:312*

Set the interval at which the client should flush events. The client will automatically flush events to Segment every [flushInterval](analytics.chainedconfiguration.android.md#flushinterval) duration, regardless of [flushAt](analytics.chainedconfiguration.configuration.md#flushat).

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| every | `number` |  the interval in milliseconds |

**Returns:** `this`

___
<a id="ios"></a>

###  ios

▸ **ios**(): [iOS](analytics.chainedconfiguration.ios.md)

*Inherited from [Base](analytics.chainedconfiguration.base.md).[ios](analytics.chainedconfiguration.base.md#ios)*

*Defined in analytics.ts:247*

Access iOS specific settings

**Returns:** [iOS](analytics.chainedconfiguration.ios.md)

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *[WriteKey](../#writekey)*): `Promise`<[Client](../classes/analytics.client.md)>

*Inherited from [Base](analytics.chainedconfiguration.base.md).[setup](analytics.chainedconfiguration.base.md#setup)*

*Defined in analytics.ts:243*

Finalize the configuration and initialize the Analytics client.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| writeKey | [WriteKey](../#writekey) |  your Segment.io write key |

**Returns:** `Promise`<[Client](../classes/analytics.client.md)>

___

