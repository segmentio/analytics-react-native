import track from '../track';
import type { TrackEventType } from '@segment/analytics-react-native';
import { logEvent } from '../__mocks__/react-native-appsflyer';

describe('#identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs an event without properties', () => {
    const payload = {
      type: 'track',
      event: 'Some Event',
    };

    track(payload as TrackEventType);

    expect(logEvent).toHaveBeenCalledWith('Some Event', {});
  });

  it('logs an event with revenue as string and currency', () => {
    const payload = {
      type: 'track',
      event: 'Some Event',
      properties: {
        currency: 'JPY',
        revenue: '1',
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logEvent).toHaveBeenCalledWith('Some Event', {
      foo: 'bar',
      af_revenue: 1,
      af_currency: 'JPY',
    });
  });

  it('logs an event with revenue as number and currency', () => {
    const payload = {
      type: 'track',
      event: 'Some Event',
      properties: {
        currency: 'JPY',
        revenue: 1,
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logEvent).toHaveBeenCalledWith('Some Event', {
      foo: 'bar',
      af_revenue: 1,
      af_currency: 'JPY',
    });
  });

  it('logs an event with raw properties if they cannot be extracted', () => {
    const payload = {
      type: 'track',
      event: 'Some Event',
      properties: {
        currency: 'JPY',
        revenue: true,
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logEvent).toHaveBeenCalledWith('Some Event', {
      currency: 'JPY',
      revenue: true,
      foo: 'bar',
    });
  });

  it('logs an event with the default currency', () => {
    const payload = {
      type: 'track',
      event: 'Some Event',
      properties: {
        revenue: '1',
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logEvent).toHaveBeenCalledWith('Some Event', {
      foo: 'bar',
      af_revenue: 1,
      af_currency: 'USD',
    });
  });
});
