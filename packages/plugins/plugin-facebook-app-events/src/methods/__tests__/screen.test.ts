import type { ScreenEventType } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import screen from '../screen';

jest.mock('react-native-fbsdk-next', () => ({
  AppEventsLogger: {
    logEvent: jest.fn(),
  },
}));

describe('#screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the screen event', () => {
    const event = {
      type: 'screen',
      name: 'Home',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as ScreenEventType;

    screen(event);

    expect(AppEventsLogger.logEvent).toHaveBeenCalledWith(
      'Viewed Home Screen',
      {}
    );
  });
});
