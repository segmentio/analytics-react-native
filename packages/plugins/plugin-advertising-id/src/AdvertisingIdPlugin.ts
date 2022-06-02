//@ts-ignore
import { DestinationPlugin, PluginType } from '@segment/analytics-react-native';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';
import {
  createStore,
  registerBridgeStore,
  Store,
  Persistor,
} from '@segment/sovran-react-native';
import type { AdvertisingIdData } from './types';

const advertisingIdStore = createStore<AdvertisingIdData>({
  id: '',
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

export class AdvertisingIdPlugin extends DestinationPlugin {
  type = PluginType.enrichment;

  private storePersistor?: Persistor;
  private advertisingIdStore: Store<AdvertisingIdData> = advertisingIdStore;

  constructor() {
    super();
    this.advertisingIdStore = createStore(
      { id: '' },
      {
        persist: {
          storeId: 'advertisingId-store',
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

    this.getAdvertisingId();
  }

  getAdvertisingId() {
    let adIdData = this.advertisingIdData.get();

    if (adIdData.id !== '') {
      this.analytics?.context.set({
        device: {
          advertisingId: adIdData.id,
          adTrackingEnabled: true,
        },
      });
    }

    this.advertisingIdData.onChange((data) => {
      this.analytics?.context.set({
        device: {
          advertisingId: data.id,
          adTrackingEnabled: true,
        },
      });
    });
  }
}
