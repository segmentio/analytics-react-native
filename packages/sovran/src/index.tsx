import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { onStoreAction } from './bridge';

const LINKING_ERROR =
  `The package 'sovran-react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const Sovran = NativeModules.Sovran;
if (Sovran) {
  const { ON_STORE_ACTION } = Sovran.getConstants();

  const SovranBridge = new NativeEventEmitter(Sovran);

  // Listen to Native events
  SovranBridge.addListener(ON_STORE_ACTION, (event) => {
    onStoreAction(event.type, event.payload);
  });
} else {
  console.warn(LINKING_ERROR);
}
export { createStore, Store, Notify, Unsubscribe } from './store';
export { registerBridgeStore } from './bridge';
export * from './persistor';
