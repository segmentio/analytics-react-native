const mockLogEvent = jest.fn();
const mockDeprecatedLogScreenView = jest.fn();
const mockAnalytics = { logScreenView: mockDeprecatedLogScreenView };

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn().mockImplementation(() => mockAnalytics),
  logEvent: mockLogEvent,
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

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'screen_view', {
      screen_name: 'HomeScreen',
      screen_class: 'HomeScreen',
    });
  });

  it('does not call the deprecated logScreenView method', async () => {
    const event = {
      type: 'screen',
      name: 'HomeScreen',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as ScreenEventType;

    await screen(event);

    expect(mockDeprecatedLogScreenView).not.toHaveBeenCalled();
  });
});
