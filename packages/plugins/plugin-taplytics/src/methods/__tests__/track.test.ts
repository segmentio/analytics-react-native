import type { TrackEventType } from '@segment/analytics-react-native/src';
import track from '../track';
import * as Taplytics from 'taplytics-react-native';

jest.mock('taplytics-react-native', () => ({
  logEvent: jest.fn(),
}));

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a track event', () => {
    const event = {
      type: 'track',
      event: 'Track Event',
      properties: {
        description: 'description',
        test: 'test',
      },
    } as TrackEventType;

    track(event);

    expect(Taplytics.logEvent).toHaveBeenCalledTimes(1);
    expect(Taplytics.logEvent).toHaveBeenCalledWith(
      'TRACK event: Track Event',
      0,
      {
        description: 'description',
        test: 'test',
      }
    );
  });
});
