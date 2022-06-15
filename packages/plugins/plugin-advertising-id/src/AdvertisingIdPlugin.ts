//@ts-ignore
import { Plugin, PluginType } from '@segment/analytics-react-native';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';
import {
  createStore,
  registerBridgeStore,
  Store,
  Persistor,
  Unsubscribe,
} from '@segment/sovran-react-native';
import type { AdvertisingIdData, StorageConfig } from './types';

const advertisingIdStore = createStore<AdvertisingIdData>({
  id: undefined,
});

/**
 * Action to set the referring app and link url
 * @param advertisingIdData referring app and link url
 */

const addAdvertisingIdData = (advertisingIdData: AdvertisingIdData) => () => {
  return {
    id: advertisingIdData.id,
  };
};

registerBridgeStore({
  store: advertisingIdStore,
  actions: {
    'add-advertisingId-data': addAdvertisingIdData,
  },
});

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;
  hasRegisteredListener: boolean = false;
  private storeId: string;
  private storePersistor?: Persistor;
  private advertisingIdStore: Store<AdvertisingIdData> = advertisingIdStore;
  private watcher: Unsubscribe[] = [];

  constructor(config: StorageConfig) {
    super();
    this.storeId = config.storeId;
    this.storePersistor = config.storePersistor;
    this.advertisingIdStore = createStore<AdvertisingIdData>(
      { id: undefined },
      {
        persist: {
          storeId: `${this.storeId}-context`,
          persistor: this.storePersistor,
        },
      }
    );
  }

  readonly advertisingIdData = {
    get: () => this.advertisingIdStore.getState(),
    onChange: (callback: (value: AdvertisingIdData) => void) =>
      this.advertisingIdStore.subscribe(callback),
  };

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;
    console.log('PLUGIN ENABLED');
    this.setTrackingStatus();

    if (this.hasRegisteredListener === false) {
      this.registerTrackingStatusListener();
    }
  }

  setTrackingStatus() {
    let adIdData = this.advertisingIdData.get();

    if (adIdData.id !== undefined) {
      this.setContext(adIdData);
    }
  }

  registerTrackingStatusListener() {
    this.advertisingIdData.onChange((data) => {
      this.setContext(data);
    });
    this.hasRegisteredListener = true;
  }

  setContext(adIdData: AdvertisingIdData) {
    this.analytics?.context.set({
      device: {
        advertisingId: adIdData.id,
        adTrackingEnabled: true,
      },
    });
  }

  shutdown(): void {
    if (this.watcher.length > 0) {
      for (const unsubscribe of this.watcher) {
        try {
          unsubscribe();
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
}
