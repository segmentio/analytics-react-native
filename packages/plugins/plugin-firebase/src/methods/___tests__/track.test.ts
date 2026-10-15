const mockLogEvent = jest.fn();
const mockDeprecatedLogEvent = jest.fn();
const mockAnalytics = { logEvent: mockDeprecatedLogEvent };

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn().mockImplementation(() => mockAnalytics),
  logEvent: mockLogEvent,
  isString: (a: unknown) => typeof a === 'string',
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));
jest.mock('uuid');

import { EventType, TrackEventType } from '@segment/analytics-react-native';
import track from '../track';

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
    expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'test_event', {});
  });

  it('uses the modular API instead of the deprecated instance method', async () => {
    const event = {
      type: EventType.TrackEvent,
      event: 'test_event',
      anonymousId: 'anon',
      messageId: 'message-id',
      timestamp: '00000',
      properties: {},
    } as TrackEventType;

    await track(event);

    expect(mockDeprecatedLogEvent).not.toHaveBeenCalled();
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
    expect(mockLogEvent).toHaveBeenCalledWith(
      mockAnalytics,
      'another_test_event',
      {
        foo: 'bar',
      }
    );
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
      mockAnalytics,
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
    expect(mockLogEvent).toHaveBeenCalledWith(mockAnalytics, 'refund', {});
  });
});
