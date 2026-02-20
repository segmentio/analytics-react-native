/**
 * Stub for @segment/sovran-react-native — re-exports the real pure-TS
 * implementations, bypassing index.tsx which has React Native bridge deps.
 */

export { createStore } from '../../../packages/sovran/src/store';
export type { Store, Notify, Unsubscribe } from '../../../packages/sovran/src/store';
export { registerBridgeStore } from '../../../packages/sovran/src/bridge';
export type {
  Persistor,
  PersistenceConfig,
} from '../../../packages/sovran/src/persistor/persistor';
