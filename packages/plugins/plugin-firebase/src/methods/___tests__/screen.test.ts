import type { ScreenEventType } from '@segment/analytics-react-native/src';
import screen from '../screen';

const mockScreen = jest.fn();

jest.mock('@react-native-firebase/analytics', () => () => ({
  logScreenView: mockScreen,
}));

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
