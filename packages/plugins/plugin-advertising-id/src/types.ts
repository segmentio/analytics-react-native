import type { Persistor } from '@segment/sovran-react-native';
export interface AdvertisingIdData {
  id?: string;
}

export type StorageConfig = {
  storeId: string;
  storePersistor?: Persistor;
};
