[@segment/analytics-react-native](../README.md) > [Client](../classes/analytics.client.md)

# Class: Client

## Hierarchy

**Client**

## Index

### Properties

* [ready](analytics.client.md#ready)

### Methods

* [alias](analytics.client.md#alias)
* [catch](analytics.client.md#catch)
* [disable](analytics.client.md#disable)
* [enable](analytics.client.md#enable)
* [flush](analytics.client.md#flush)
* [getAnonymousId](analytics.client.md#getanonymousid)
* [group](analytics.client.md#group)
* [identify](analytics.client.md#identify)
* [middleware](analytics.client.md#middleware)
* [reset](analytics.client.md#reset)
* [screen](analytics.client.md#screen)
* [setup](analytics.client.md#setup)
* [track](analytics.client.md#track)
* [useNativeConfiguration](analytics.client.md#usenativeconfiguration)

---

## Properties

<a id="ready"></a>

###  ready

**● ready**: *`false`* = false

*Defined in analytics.ts:96*

___

## Methods

<a id="alias"></a>

###  alias

▸ **alias**(newId: *`string`*, options?: *[Options]()*): `Promise`<`void`>

*Defined in analytics.ts:266*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| newId | `string` | - |  The new ID you want to alias the existing ID to. The existing ID will be either the previousId if you have called identify, or the anonymous ID. |
| `Default value` options | [Options]() |  {} |

**Returns:** `Promise`<`void`>

___
<a id="catch"></a>

###  catch

▸ **catch**(handler: *[ErrorHandler]()*): `this`

*Defined in analytics.ts:111*

**Parameters:**

| Name | Type |
| ------ | ------ |
| handler | [ErrorHandler]() |

**Returns:** `this`

___
<a id="disable"></a>

###  disable

▸ **disable**(): `Promise`<`void`>

*Defined in analytics.ts:305*

**Returns:** `Promise`<`void`>

___
<a id="enable"></a>

###  enable

▸ **enable**(): `Promise`<`void`>

*Defined in analytics.ts:295*

**Returns:** `Promise`<`void`>

___
<a id="flush"></a>

###  flush

▸ **flush**(): `Promise`<`void`>

*Defined in analytics.ts:286*

**Returns:** `Promise`<`void`>

___
<a id="getanonymousid"></a>

###  getAnonymousId

▸ **getAnonymousId**(): `Promise`<`string`>

*Defined in analytics.ts:310*

**Returns:** `Promise`<`string`>

___
<a id="group"></a>

###  group

▸ **group**(groupId: *`string`*, traits?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in analytics.ts:253*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| groupId | `string` | - |  A database ID for this group. |
| `Default value` traits | [JsonMap]() |  {} |  A dictionary of traits you know about the group. Things like: name, employees, etc. |
| `Default value` options | [Options]() |  {} |  A dictionary of options, e.g. integrations (thigh analytics integration to forward the event to) |

**Returns:** `Promise`<`void`>

___
<a id="identify"></a>

###  identify

▸ **identify**(user: *`string`*, traits?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in analytics.ts:240*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| user | `string` | - |  database ID (or email address) for this user. If you don't have a userId but want to record traits, you should pass nil. For more information on how we generate the UUID and Apple's policies on IDs, see [https://segment.io/libraries/ios#ids](https://segment.io/libraries/ios#ids) |
| `Default value` traits | [JsonMap]() |  {} |  A dictionary of traits you know about the user. Things like: email, name, plan, etc. |
| `Default value` options | [Options]() |  {} |  A dictionary of options, e.g. integrations (thigh analytics integration to forward the event to) |

**Returns:** `Promise`<`void`>

___
<a id="middleware"></a>

###  middleware

▸ **middleware**(middleware: *[Middleware]()*): `this`

*Defined in analytics.ts:149*

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| middleware | [Middleware]() |   |

**Returns:** `this`

___
<a id="reset"></a>

###  reset

▸ **reset**(): `Promise`<`void`>

*Defined in analytics.ts:276*

**Returns:** `Promise`<`void`>

___
<a id="screen"></a>

###  screen

▸ **screen**(name: *`string`*, properties?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in analytics.ts:225*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| name | `string` | - |  The title of the screen being viewed. We recommend using human-readable names like 'Photo Feed' or 'Completed Purchase Screen'. |
| `Default value` properties | [JsonMap]() |  {} |  A dictionary of properties for the screen view event. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc. |
| `Default value` options | [Options]() |  {} |

**Returns:** `Promise`<`void`>

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *`string`*, configuration?: *[Configuration](../interfaces/analytics.configuration.md)*): `Promise`<`void`>

*Defined in analytics.ts:188*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| writeKey | `string` | - |  Your Segment.io write key |
| `Default value` configuration | [Configuration](../interfaces/analytics.configuration.md) |  {} |  An optional [Configuration](../interfaces/analytics.configuration.md) object. |

**Returns:** `Promise`<`void`>

___
<a id="track"></a>

###  track

▸ **track**(event: *`string`*, properties?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in analytics.ts:207*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| event | `string` | - |  The name of the event you're tracking. We recommend using human-readable names like \`Played a Song\` or \`Updated Status\`. |
| `Default value` properties | [JsonMap]() |  {} |  A dictionary of properties for the event. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc. |
| `Default value` options | [Options]() |  {} |  A dictionary of options, e.g. integrations (thigh analytics integration to forward the event to) |

**Returns:** `Promise`<`void`>

___
<a id="usenativeconfiguration"></a>

###  useNativeConfiguration

▸ **useNativeConfiguration**(): `this`

*Defined in analytics.ts:161*

**Returns:** `this`

___

