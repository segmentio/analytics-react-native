# @segment/sovran-react-native

A cross-platform lightweight local state management system designed for React Native.

## Motivation

Redux is a great global state management tool for React, but it's not a good fit when you need to have local state management at different scope levels.

The main advantages of Sovran vs Redux are:

- Sovran is lightweight and simple to use. Subscribing and dispatching actions is easy to setup.
- Sovran can manage state at different scope levels. From global to local to a single object.
- Sovran is designed to be used with React Native so it supports dispatching actions via the bridge native -> RN

## Installation

```sh
npm install @segment/sovran-react-native
```

## Usage

To use in JS/TS you just need to use `createStore` to create a sovran object.

```ts
import { createStore } from '@segment/sovran-react-native';

interface State {
  count: number;
}

// Create the sovran store with our type and initial state
const store = createStore<State>({
  count: 0,
});
```

`createStore` accepts any object as a state.
You only need to pass the **initial state** as a parameter.
Returns a **Store** object:

### Store object

The returned store object has the following methods:

#### **subscribe(callback)**:

Subscribes a listener to updates on the store:

```ts
const unsubscribe = store.subscribe((newState: State) => {
  // do something with the new state
  console.log(newState);
});

// When you want to get rid of the listener
unsubscribe();
```

#### **dispatch(action)**:

Dispatches an action to modify the state, actions can be async:

Remember to keep actions as pure functions.

```ts
store.dispatch((state: State): State => {
  return {
    ...state,
    count: state.count + 1,
  };
});
```

#### **getState()**:

Returns the current state on the store:

```ts
const currentState: State = store.getState();
```

## Native -> RN Updates

Sovran supports dispatching actions from native to RN. Very useful for brownfield apps.

To use this feature you first need to register which stores will listen to native updates and which actions can be sent from native:

```ts
import { createStore, registerBridgeStore } from '@segment/sovran-react-native';

interface MessageQueue {
  messages: string[];
}

// Create the sovran store with our type and initial state
const messages = createStore<MessageQueue>({
  messages: [],
});

// Action to add new events
const addMessage = (message: Message) => (state: MessageQueue) => ({
  messages: [...state.messages, message],
});

// Register the store to listen to native events
registerBridgeStore({
  // Sets which store object is listenning
  store: messages,
  // Defines which action types can be sent from native and how to handle them
  actions: {
    'add-message': addMessage,
  },
});
```

Now you are ready to send updates from native code!

### iOS

(Supports both Objective-C and Swift)

```objc

@import React;
@import sovran_react_native;

// ...

[Sovran dispatchWithAction:@"add-message" payload:@{ @"origin": @"Native", @"message": @"Hello from Objective-C!" }];
```

### Android

(Supports both Java and Kotlin)

```java
import com.sovranreactnative.Sovran;

public class MainApplication extends Application implements ReactApplication {

  private Sovran sovran = new Sovran();

  private final ReactNativeHost mReactNativeHost =
      new ReactNativeHost(this) {

  // Due to how Android registers modules for RN make sure you instantiate the Sovran Module package first and use the same one when you register it in you MainApplication
  @Override
  protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    // Register the same sovran object
    packages.add(sovran);
    return packages;
  }


  // ...

  Map<String, String> payload = new HashMap<>();
  payload.put("origin", "Native");
  payload.put("message", "Hello from Java/Kotlin!");
  sovran.dispatch("add-message", payload);

//...
```

**Check out the Example project for a more in depth use case in an RN project!**

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
