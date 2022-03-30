import type { ScreenEventType } from '@segment/analytics-react-native/src';
import screen from '../screen';
import * as Taplytics from 'taplytics-react-native';

jest.mock('taplytics-react-native', () => ({
  logEvent: jest.fn(),
}));

describe('#screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a screen event', () => {
    const event = {
      type: 'screen',
      name: 'Test Screen',
      properties: {
        description: 'description',
        test: 'test',
      },
    } as ScreenEventType;

    screen(event);

    expect(Taplytics.logEvent).toHaveBeenCalledTimes(1);
    expect(Taplytics.logEvent).toHaveBeenCalledWith(
      'SCREEN event: Test Screen',
      0,
      {
        description: 'description',
        test: 'test',
      }
    );
  });
});
