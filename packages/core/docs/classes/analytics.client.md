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
* [setIDFA](analytics.client.md#setidfa)
* [setup](analytics.client.md#setup)
* [track](analytics.client.md#track)
* [useNativeConfiguration](analytics.client.md#usenativeconfiguration)

---

## Properties

<a id="ready"></a>

###  ready

**● ready**: *`false`* = false

*Defined in [analytics.ts:152](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L152)*

___

## Methods

<a id="alias"></a>

###  alias

▸ **alias**(newId: *`string`*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:330](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L330)*

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

*Defined in [analytics.ts:167](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L167)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| handler | [ErrorHandler]() |

**Returns:** `this`

___
<a id="disable"></a>

###  disable

▸ **disable**(): `Promise`<`void`>

*Defined in [analytics.ts:369](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L369)*

**Returns:** `Promise`<`void`>

___
<a id="enable"></a>

###  enable

▸ **enable**(): `Promise`<`void`>

*Defined in [analytics.ts:359](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L359)*

**Returns:** `Promise`<`void`>

___
<a id="flush"></a>

###  flush

▸ **flush**(): `Promise`<`void`>

*Defined in [analytics.ts:350](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L350)*

**Returns:** `Promise`<`void`>

___
<a id="getanonymousid"></a>

###  getAnonymousId

▸ **getAnonymousId**(): `Promise`<`string`>

*Defined in [analytics.ts:374](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L374)*

**Returns:** `Promise`<`string`>

___
<a id="group"></a>

###  group

▸ **group**(groupId: *`string`*, traits?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:317](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L317)*

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

▸ **identify**(user: *`string` \| `null`*, traits?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:304](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L304)*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| user | `string` \| `null` | - |  database ID (or email address) for this user. If you don't have a userId but want to record traits, you should pass nil. For more information on how we generate the UUID and Apple's policies on IDs, see [https://segment.io/libraries/ios#ids](https://segment.io/libraries/ios#ids) |
| `Default value` traits | [JsonMap]() |  {} |  A dictionary of traits you know about the user. Things like: email, name, plan, etc. |
| `Default value` options | [Options]() |  {} |  A dictionary of options, e.g. integrations (thigh analytics integration to forward the event to) |

**Returns:** `Promise`<`void`>

___
<a id="middleware"></a>

###  middleware

▸ **middleware**(middleware: *[Middleware]()*): `this`

*Defined in [analytics.ts:213](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L213)*

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| middleware | [Middleware]() |   |

**Returns:** `this`

___
<a id="reset"></a>

###  reset

▸ **reset**(): `Promise`<`void`>

*Defined in [analytics.ts:340](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L340)*

**Returns:** `Promise`<`void`>

___
<a id="screen"></a>

###  screen

▸ **screen**(name: *`string`*, properties?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:289](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L289)*

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| name | `string` | - |  The title of the screen being viewed. We recommend using human-readable names like 'Photo Feed' or 'Completed Purchase Screen'. |
| `Default value` properties | [JsonMap]() |  {} |  A dictionary of properties for the screen view event. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc. |
| `Default value` options | [Options]() |  {} |

**Returns:** `Promise`<`void`>

___
<a id="setidfa"></a>

###  setIDFA

▸ **setIDFA**(idfa: *`string`*): `void`

*Defined in [analytics.ts:177](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L177)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| idfa | `string` |

**Returns:** `void`

___
<a id="setup"></a>

###  setup

▸ **setup**(writeKey: *`string`*, configuration?: *[Configuration](../interfaces/analytics.configuration.md)*): `Promise`<`void`>

*Defined in [analytics.ts:252](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L252)*

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

*Defined in [analytics.ts:271](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L271)*

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

*Defined in [analytics.ts:225](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L225)*

**Returns:** `this`

___

