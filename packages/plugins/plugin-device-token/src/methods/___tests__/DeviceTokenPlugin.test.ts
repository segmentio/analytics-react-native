import { DeviceTokenPlugin } from '../../DeviceTokenPlugin';
import { MockSegmentStore } from '../../../../../core/src/__tests__/__helpers__/mockSegmentStore';
import { getMockLogger } from '../../../../../core/src/__tests__/__helpers__/mockLogger';
import { SegmentClient } from '../../../../../core/src/analytics';
import { Platform } from 'react-native';

const mockRequestPermission = jest.fn().mockReturnValue(1);
const mockGetAPNSToken = jest.fn();
const mockGetDeviceToken = jest.fn();

jest.mock('@react-native-firebase/messaging', () => () => ({
  getAPNSToken: mockGetAPNSToken,
  getToken: mockGetDeviceToken,
  hasPermission: mockRequestPermission,
}));

describe('DeviceTokenPlugin', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
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
    let configureSpy = jest.spyOn(plugin, 'configure');
    let analytics = new SegmentClient(clientArgs);

    jest.mock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'ios',
      select: () => null,
    }));

    await plugin.configure(analytics);

    expect(configureSpy).toHaveBeenCalledWith(analytics);
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('retrieves the APNS value if authorized and OS is iOS', async () => {
    let configureSpy = jest.spyOn(plugin, 'configure');
    let analytics = new SegmentClient(clientArgs);
    Platform.OS = 'ios';
    await plugin.configure(analytics);

    expect(Platform.OS).toEqual('ios');
    expect(mockRequestPermission).toHaveReturnedWith(1);

    expect(configureSpy).toHaveBeenCalledWith(analytics);
    expect(mockGetAPNSToken).toHaveBeenCalled();
  });

  it('retrieves the device token for Android builds', async () => {
    let configureSpy = jest.spyOn(plugin, 'configure');
    let analytics = new SegmentClient(clientArgs);
    Platform.OS = 'android';
    await plugin.configure(analytics);

    expect(Platform.OS).toEqual('android');

    expect(configureSpy).toHaveBeenCalledWith(analytics);
    expect(mockGetDeviceToken).toHaveBeenCalled();
  });

  it('retrieves the device token when updatePermissions is called', async () => {
    Platform.OS = 'ios';

    await plugin.updatePermissionStatus();

    expect(mockGetAPNSToken).toHaveBeenCalled();
  });
});
