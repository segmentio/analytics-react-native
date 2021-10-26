import { Platform } from 'react-native';

export const batchApi = Platform.select({
  ios: 'http://localhost:9091',
  android: 'http://10.0.2.2:9091',
});
