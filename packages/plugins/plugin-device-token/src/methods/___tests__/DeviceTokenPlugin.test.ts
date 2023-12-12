import { SegmentClient } from '@segment/analytics-react-native';
import {
  getMockLogger,
  MockSegmentStore,
} from '@segment/analytics-react-native/src/test-helpers';
import { Platform } from 'react-native';

import { DeviceTokenPlugin } from '../../DeviceTokenPlugin';

const mockRequestPermission = jest.fn().mockReturnValue(1);
const mockGetAPNSToken = jest.fn().mockReturnValue('device-token');
const mockGetDeviceToken = jest.fn().mockReturnValue('device-token');

jest.mock('@react-native-firebase/messaging', () => () => ({
  getAPNSToken: mockGetAPNSToken,
  getToken: mockGetDeviceToken,
  hasPermission: mockRequestPermission,
}));

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: () => null,
}));

describe('DeviceTokenPlugin', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
      flushInterval: 0,
    },
    store,
  };
  let plugin: DeviceTokenPlugin = new DeviceTokenPlugin();

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
    plugin = new DeviceTokenPlugin();
  });

  it('requests authorization when configure is called', async () => {
    const analytics = new SegmentClient(clientArgs);

    await plugin.configure(analytics);

    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('retrieves the APNS value if authorized and OS is iOS', async () => {
    Platform.OS = 'ios';
    const analytics = new SegmentClient(clientArgs);
    await plugin.configure(analytics);

    expect(mockRequestPermission).toHaveReturnedWith(1);
    expect(mockGetAPNSToken).toHaveBeenCalled();
  });

  it('retrieves the device token for Android builds', async () => {
    Platform.OS = 'android';
    const analytics = new SegmentClient(clientArgs);

    await plugin.configure(analytics);

    expect(mockGetDeviceToken).toHaveBeenCalled();
  });

  it('retrieves the device token when updatePermissions is called', async () => {
    Platform.OS = 'ios';

    await plugin.updatePermissionStatus();

    expect(mockGetAPNSToken).toHaveBeenCalled();
  });

  it('sets the device token in context for iOS', async () => {
    const analytics = new SegmentClient(clientArgs);
    await plugin.configure(analytics);

    const token = await store.context.get(true);
    expect(token).toEqual({ device: { token: 'device-token' } });
  });

  it('sets the device token in context for Android', async () => {
    Platform.OS = 'android';
    const analytics = new SegmentClient(clientArgs);
    await plugin.configure(analytics);

    const token = await store.context.get(true);
    expect(token).toEqual({ device: { token: 'device-token' } });
  });
});
