const mockSetUserId = jest.fn();
const mockSetUserProperties = jest.fn();

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn().mockImplementation(() => ({
    setUserId: mockSetUserId,
    setUserProperties: mockSetUserProperties,
  })),
  isString: (a: unknown) => typeof a === 'string',
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

import type { IdentifyEventType } from '@segment/analytics-react-native';
import { FirebasePlugin } from '../../FirebasePlugin';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the identify event with ID only', async () => {
    const plugin = new FirebasePlugin();
    const event = {
      type: 'identify',
      userId: '123',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
    } as IdentifyEventType;

    await plugin.identify(event);

    expect(mockSetUserId).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).not.toHaveBeenCalled();
    expect(mockSetUserId).toHaveBeenCalledWith('123');
  });

  it('forwards the identify event with ID and properties', async () => {
    const plugin = new FirebasePlugin();
    const event = {
      type: 'identify',
      userId: '123',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      traits: {
        name: 'Mary',
      },
    } as IdentifyEventType;

    await plugin.identify(event);

    expect(mockSetUserId).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).toHaveBeenCalledTimes(1);
    expect(mockSetUserId).toHaveBeenCalledWith('123');
    expect(mockSetUserProperties).toHaveBeenCalledWith({ name: 'Mary' });
  });

  it('forwards the identify event without ID', async () => {
    const plugin = new FirebasePlugin();
    const event = {
      type: 'identify',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      traits: {
        name: 'Mary',
      },
    } as IdentifyEventType;

    await plugin.identify(event);

    expect(mockSetUserId).not.toHaveBeenCalled();
    expect(mockSetUserProperties).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).toHaveBeenCalledWith({ name: 'Mary' });
  });
});
