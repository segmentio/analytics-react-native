import { NativeModules } from 'react-native';
import { getUUID } from '../uuid';

describe('#uuid', () => {
  beforeEach(() => {
    NativeModules.AnalyticsReactNative = {
      getUUIDSync: () => {},
    };
  });

  it('should get a UUID from the bridge in prod', () => {
    const oldDevValue = __DEV__;
    (global as any).__DEV__ = false;
    const id = 'nativeUUID-123';
    jest
      .spyOn(NativeModules.AnalyticsReactNative, 'getUUIDSync')
      .mockReturnValueOnce(id);

    const result = getUUID();

    expect(result).toBe(id);
    (global as any).__DEV__ = oldDevValue;
  });
});
