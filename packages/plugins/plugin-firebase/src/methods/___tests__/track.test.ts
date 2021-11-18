import { EventType, TrackEventType } from '@segment/analytics-react-native';
import track from '../track';

const mockLogEvent = jest.fn();

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: mockLogEvent,
}));

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards a track event with name only', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith('test_event', {});
  });

  it('forwards a track event with name and properties', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'another_test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: { foo: 'bar' },
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith('another_test_event', {
      foo: 'bar',
    });
  });

  it('removes non-alphanumeric characters from', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'yet another!!test$%^&event-CAPS',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith(
      'yet_another__test____event_CAPS',
      {}
    );
  });

  it('converts the event name to firebase event when applicable', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'Order Refunded',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith('purchase_refund', {});
  });
});
