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
* [configure](analytics.client.md#configure)
* [disable](analytics.client.md#disable)
* [enable](analytics.client.md#enable)
* [flush](analytics.client.md#flush)
* [group](analytics.client.md#group)
* [identify](analytics.client.md#identify)
* [middleware](analytics.client.md#middleware)
* [reset](analytics.client.md#reset)
* [screen](analytics.client.md#screen)
* [track](analytics.client.md#track)

---

## Properties

<a id="ready"></a>

###  ready

**● ready**: *`false`* = false

*Defined in analytics.ts:13*

Whether the client is ready to send events to Segment.

This becomes `true` when `.setup()` succeeds. All calls will be queued until it becomes `true`.

___

## Methods

<a id="alias"></a>

###  alias

▸ **alias**(newId: *`string`*): `Promise`<`void`>

*Defined in analytics.ts:124*

Merge two user identities, effectively connecting two sets of user data as one. This may not be supported by all integrations.

When you learn more about who the group is, you can record that information with group.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| newId | `string` |  The new ID you want to alias the existing ID to. The existing ID will be either the previousId if you have called identify, or the anonymous ID. |

**Returns:** `Promise`<`void`>

___
<a id="catch"></a>

###  catch

▸ **catch**(handler: *[ErrorHandler]()*): `this`

*Defined in analytics.ts:26*

Catch React-Native bridge errors

These errors are emitted when calling the native counterpart.

**Parameters:**

| Param | Type |
| ------ | ------ |
| handler | [ErrorHandler]() |

**Returns:** `this`

___
<a id="configure"></a>

###  configure

▸ **configure**(): [Configuration](../interfaces/analytics.chainedconfiguration.configuration.md)

*Defined in analytics.ts:52*

Configure the Analytics module.

This method returns a fluent-style API to configure the SDK :

```js
analytics
  .configure()
    .using(Mixpanel, GoogleAnalytics)
    .trackAppLifecycle()
    .ios()
      .trackDeepLinks()
  .setup("YOUR_WRITE_KEY")
```

**Returns:** [Configuration](../interfaces/analytics.chainedconfiguration.configuration.md)

___
<a id="disable"></a>

###  disable

▸ **disable**(): `Promise`<`void`>

*Defined in analytics.ts:163*

Completely disable the sending of any analytics data.

If you have a way for users to actively or passively (sometimes based on location) opt-out of analytics data collection, you can use this method to turn off all data collection.

**Returns:** `Promise`<`void`>

___
<a id="enable"></a>

###  enable

▸ **enable**(): `Promise`<`void`>

*Defined in analytics.ts:153*

Enable the sending of analytics data. Enabled by default.

Occasionally used in conjunction with disable user opt-out handling.

**Returns:** `Promise`<`void`>

___
<a id="flush"></a>

###  flush

▸ **flush**(): `Promise`<`void`>

*Defined in analytics.ts:144*

Trigger an upload of all queued events.

This is useful when you want to force all messages queued on the device to be uploaded. Please note that not all integrations respond to this method.

**Returns:** `Promise`<`void`>

___
<a id="group"></a>

###  group

▸ **group**(groupId: *`string`*, traits?: *`bridge.JsonMap`*): `Promise`<`void`>

*Defined in analytics.ts:111*

Associate a user with a group, organization, company, project, or w/e _you_ call them.

When you learn more about who the group is, you can record that information with group.

**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| groupId | `string` | - |  A database ID for this group. |
| `Default value` traits | `bridge.JsonMap` |  {} |  A dictionary of traits you know about the group. Things like: name, employees, etc. |

**Returns:** `Promise`<`void`>

___
<a id="identify"></a>

###  identify

▸ **identify**(user: *`string`*, traits?: *`bridge.JsonMap`*): `Promise`<`void`>

*Defined in analytics.ts:99*

Associate a user with their unique ID and record traits about them.

When you learn more about who your user is, you can record that information with identify.

**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| user | `string` | - |  database ID (or email address) for this user. If you don't have a userId but want to record traits, you should pass nil. For more information on how we generate the UUID and Apple's policies on IDs, see [https://segment.io/libraries/ios#ids](https://segment.io/libraries/ios#ids) |
| `Default value` traits | `bridge.JsonMap` |  {} |  A dictionary of traits you know about the user. Things like: email, name, plan, etc. |

**Returns:** `Promise`<`void`>

___
<a id="middleware"></a>

###  middleware

▸ **middleware**(middleware: *[Middleware]()*): `this`

*Defined in analytics.ts:32*

**Parameters:**

| Param | Type |
| ------ | ------ |
| middleware | [Middleware]() |

**Returns:** `this`

___
<a id="reset"></a>

###  reset

▸ **reset**(): `Promise`<`void`>

*Defined in analytics.ts:134*

Reset any user state that is cached on the device.

This is useful when a user logs out and you want to clear the identity. It will clear any traits or userId's cached on the device.

**Returns:** `Promise`<`void`>

___
<a id="screen"></a>

###  screen

▸ **screen**(name: *`string`*, properties?: *`bridge.JsonMap`*): `Promise`<`void`>

*Defined in analytics.ts:85*

Record the screens or views your users see.

When a user views a screen in your app, you'll want to record that here. For some tools like Google Analytics and Flurry, screen views are treated specially, and are different from "events" kind of like "page views" on the web. For services that don't treat "screen views" specially, we map "screen" straight to "track" with the same parameters. For example, Mixpanel doesn't treat "screen views" any differently. So a call to "screen" will be tracked as a normal event in Mixpanel, but get sent to Google Analytics and Flurry as a "screen".

**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| name | `string` | - |  The title of the screen being viewed. We recommend using human-readable names like 'Photo Feed' or 'Completed Purchase Screen'. |
| `Default value` properties | `bridge.JsonMap` |  {} |  A dictionary of properties for the screen view event. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc. |

**Returns:** `Promise`<`void`>

___
<a id="track"></a>

###  track

▸ **track**(event: *`string`*, properties?: *`bridge.JsonMap`*): `Promise`<`void`>

*Defined in analytics.ts:67*

Record the actions your users perform.

When a user performs an action in your app, you'll want to track that action for later analysis. Use the event name to say what the user did, and properties to specify any interesting details of the action.

**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| event | `string` | - |  The name of the event you're tracking. We recommend using human-readable names like \`Played a Song\` or \`Updated Status\`. |
| `Default value` properties | `bridge.JsonMap` |  {} |  A dictionary of properties for the event. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc. |

**Returns:** `Promise`<`void`>

___

