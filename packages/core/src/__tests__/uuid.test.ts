import { NativeModules } from 'react-native';
import * as nanoid from 'nanoid/non-secure';
import { getUUID } from '../uuid';

jest.mock('nanoid/non-secure');

describe('#uuid', () => {
  beforeEach(() => {
    NativeModules.AnalyticsReactNative = {
      getUUIDSync: () => {},
    };
  });

  it('should get a nanoId in dev mode', () => {
    const id = 'nanoId-123';
    jest.spyOn(nanoid, 'nanoid').mockReturnValueOnce(id);
    const result = getUUID();
    expect(result).toBe(id);
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
