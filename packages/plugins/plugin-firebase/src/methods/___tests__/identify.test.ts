import type { IdentifyEventType } from '@segment/analytics-react-native';
import identify from '../identify';

const mockSetUserId = jest.fn();
const mockSetUserProperties = jest.fn();

jest.mock('@react-native-firebase/analytics', () => () => ({
  setUserId: mockSetUserId,
  setUserProperties: mockSetUserProperties,
}));

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the identify event with ID only', async () => {
    const event = {
      type: 'identify',
      userId: '123',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
    } as IdentifyEventType;

    await identify(event);

    expect(mockSetUserId).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).not.toHaveBeenCalled();
    expect(mockSetUserId).toHaveBeenCalledWith('123');
  });

  it('forwards the identify event with ID and properties', async () => {
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

    await identify(event);

    expect(mockSetUserId).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).toHaveBeenCalledTimes(1);
    expect(mockSetUserId).toHaveBeenCalledWith('123');
    expect(mockSetUserProperties).toHaveBeenCalledWith({ name: 'Mary' });
  });

  it('forwards the identify event without ID', async () => {
    const event = {
      type: 'identify',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      traits: {
        name: 'Mary',
      },
    } as IdentifyEventType;

    await identify(event);

    expect(mockSetUserId).not.toHaveBeenCalled();
    expect(mockSetUserProperties).toHaveBeenCalledTimes(1);
    expect(mockSetUserProperties).toHaveBeenCalledWith({ name: 'Mary' });
  });
});
