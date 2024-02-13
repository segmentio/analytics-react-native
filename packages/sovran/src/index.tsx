import {
  NativeEventEmitter,
  NativeModule,
  NativeModules,
  Platform,
  TurboModule,
} from 'react-native';
import { onStoreAction } from './bridge';

const LINKING_ERROR =
  "The package 'sovran-react-native' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const Sovran = NativeModules.Sovran as NativeModule;

type NativeModuleConstants = { ON_STORE_ACTION: string };

if (Sovran !== undefined && Sovran !== null) {
  const { ON_STORE_ACTION } = ((
    Sovran as unknown as TurboModule
  ).getConstants?.() as NativeModuleConstants) ?? {
    ON_STORE_ACTION: '',
  };

  const SovranBridge = new NativeEventEmitter(Sovran);

  // Listen to Native events
  SovranBridge.addListener(
    ON_STORE_ACTION,
    (event: { type: string; payload: unknown }) => {
      void (async () => {
        try {
          await onStoreAction(event.type, event.payload);
        } catch (error) {
          console.warn(error);
        }
      })();
    }
  );
} else {
  console.warn(LINKING_ERROR);
}
export {
  createStore,
  type Store,
  type Notify,
  type Unsubscribe,
} from './store';
export { registerBridgeStore } from './bridge';
export * from './persistor';
