const mockScreen = jest.fn();

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn().mockImplementation(() => ({
    logScreenView: mockScreen,
  })),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

import type { ScreenEventType } from '@segment/analytics-react-native';
import screen from '../screen';

describe('#screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the screen event', async () => {
    const event = {
      type: 'screen',
      name: 'HomeScreen',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as ScreenEventType;

    await screen(event);

    expect(mockScreen).toHaveBeenCalledTimes(1);
    expect(mockScreen).toHaveBeenCalledWith({
      screen_name: 'HomeScreen',
      screen_class: 'HomeScreen',
    });
  });
});
