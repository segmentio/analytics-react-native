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

*Defined in [analytics.ts:96](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L96)*

Whether the client is ready to send events to Segment.

This becomes `true` when `.setup()` succeeds. All calls will be queued until it becomes `true`.

___

## Methods

<a id="alias"></a>

###  alias

▸ **alias**(newId: *`string`*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:266](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L266)*

Merge two user identities, effectively connecting two sets of user data as one. This may not be supported by all integrations.

When you learn more about who the group is, you can record that information with group.

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

*Defined in [analytics.ts:111](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L111)*

Catch React-Native bridge errors

These errors are emitted when calling the native counterpart. This only applies to methods with no return value (`Promise<void>`), methods like `getAnonymousId` do reject promises.

**Parameters:**

| Name | Type |
| ------ | ------ |
| handler | [ErrorHandler]() |

**Returns:** `this`

___
<a id="disable"></a>

###  disable

▸ **disable**(): `Promise`<`void`>

*Defined in [analytics.ts:305](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L305)*

Completely disable the sending of any analytics data.

If you have a way for users to actively or passively (sometimes based on location) opt-out of analytics data collection, you can use this method to turn off all data collection.

**Returns:** `Promise`<`void`>

___
<a id="enable"></a>

###  enable

▸ **enable**(): `Promise`<`void`>

*Defined in [analytics.ts:295](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L295)*

Enable the sending of analytics data. Enabled by default.

Occasionally used in conjunction with disable user opt-out handling.

**Returns:** `Promise`<`void`>

___
<a id="flush"></a>

###  flush

▸ **flush**(): `Promise`<`void`>

*Defined in [analytics.ts:286](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L286)*

Trigger an upload of all queued events.

This is useful when you want to force all messages queued on the device to be uploaded. Please note that not all integrations respond to this method.

**Returns:** `Promise`<`void`>

___
<a id="getanonymousid"></a>

###  getAnonymousId

▸ **getAnonymousId**(): `Promise`<`string`>

*Defined in [analytics.ts:310](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L310)*

Retrieve the anonymousId.

**Returns:** `Promise`<`string`>

___
<a id="group"></a>

###  group

▸ **group**(groupId: *`string`*, traits?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:253](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L253)*

Associate a user with a group, organization, company, project, or w/e _you_ call them.

When you learn more about who the group is, you can record that information with group.

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

*Defined in [analytics.ts:240](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L240)*

Associate a user with their unique ID and record traits about them.

When you learn more about who your user is, you can record that information with identify.

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

*Defined in [analytics.ts:149](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L149)*

Append a new middleware to the middleware chain.

Middlewares are a powerful mechanism that can augment the events collected by the SDK. A middleware is a simple function that is invoked by the Segment SDK and can be used to monitor, modify or reject events.

Middlewares are invoked for all events, including automatically tracked events, and external event sources like Adjust and Optimizely. This offers you the ability the customize those messages to fit your use case even if the event was sent outside your source code.

The key thing to observe here is that the output produced by the first middleware feeds into the second. This allows you to chain and compose independent middlewares!

For example, you might want to record the device year class with your events. Previously, you would have to do this everywhere you trigger an event with the Segment SDK. With middlewares, you can do this in a single place :

```js
import DeviceYearClass from 'react-native-device-year-class'

analytics.middleware(async ({next, context}) =>
  next({
    ...context,
    device_year_class: await DeviceYearClass()
  })
)
```

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| middleware | [Middleware]() |   |

**Returns:** `this`

___
<a id="reset"></a>

###  reset

▸ **reset**(): `Promise`<`void`>

*Defined in [analytics.ts:276](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L276)*

Reset any user state that is cached on the device.

This is useful when a user logs out and you want to clear the identity. It will clear any traits or userId's cached on the device.

**Returns:** `Promise`<`void`>

___
<a id="screen"></a>

###  screen

▸ **screen**(name: *`string`*, properties?: *[JsonMap]()*, options?: *[Options]()*): `Promise`<`void`>

*Defined in [analytics.ts:225](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L225)*

Record the screens or views your users see.

When a user views a screen in your app, you'll want to record that here. For some tools like Google Analytics and Flurry, screen views are treated specially, and are different from "events" kind of like "page views" on the web. For services that don't treat "screen views" specially, we map "screen" straight to "track" with the same parameters. For example, Mixpanel doesn't treat "screen views" any differently. So a call to "screen" will be tracked as a normal event in Mixpanel, but get sent to Google Analytics and Flurry as a "screen".

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

*Defined in [analytics.ts:188](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L188)*

Setup the Analytics module. All calls made before are queued and only executed if the configuration was successful.

```js
await analytics.setup('YOUR_WRITE_KEY', {
  using: [Mixpanel, GoogleAnalytics],
  trackAppLifecycleEvents: true,
  ios: {
    trackDeepLinks: true
  }
})
```

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

*Defined in [analytics.ts:207](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L207)*

Record the actions your users perform.

When a user performs an action in your app, you'll want to track that action for later analysis. Use the event name to say what the user did, and properties to specify any interesting details of the action.

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

*Defined in [analytics.ts:161](https://github.com/segmentio/analytics-react-native/blob/master/packages/core/src/analytics.ts#L161)*

Use the native configuration.

You'll need to call this method when you configure Analytics's singleton using the native API.

**Returns:** `this`

___

