import track from '../track';
import type { TrackEventType } from '@segment/analytics-react-native';
import { Adjust } from 'react-native-adjust';
import {
  addCallbackParameter,
  setRevenue,
  setTransactionId,
} from '../__mocks__/react-native-adjust';

jest.mock('react-native-adjust');

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets the anonymous_id', () => {
    const event = {
      type: 'track',
      event: 'Some event',
      anonymousId: 'anon',
    };

    const settings = {
      appToken: '',
      customEvents: {},
    };

    track(event as TrackEventType, settings);

    expect(Adjust.addSessionPartnerParameter).toHaveBeenCalledWith(
      'anonymous_id',
      'anon'
    );
  });

  it('adds callback params for each property', () => {
    const event = {
      type: 'track',
      event: 'Some event',
      anonymousId: 'anon',
      properties: {
        foo: 'bar',
        baz: 'quux',
      },
    };

    const settings = {
      appToken: '',
      customEvents: {
        'Some event': 'token',
      },
    };

    track(event as TrackEventType, settings);

    expect(Adjust.addSessionPartnerParameter).toHaveBeenCalledWith(
      'anonymous_id',
      'anon'
    );

    // expect(mappedCustomEventToken).toHaveBeenCalledWith('Some event', settings);

    expect(addCallbackParameter).toHaveBeenCalledWith('foo', 'bar');
    expect(addCallbackParameter).toHaveBeenCalledWith('baz', 'quux');
  });

  it('sets revenue correctly', () => {
    const event = {
      type: 'track',
      event: 'Some event',
      anonymousId: 'anon',
      properties: {
        revenue: 1,
        currency: 'JPY',
      },
    };

    const settings = {
      appToken: '',
      customEvents: {
        'Some event': 'token',
      },
    };

    track(event as TrackEventType, settings);

    expect(Adjust.addSessionPartnerParameter).toHaveBeenCalledWith(
      'anonymous_id',
      'anon'
    );

    // expect(mappedCustomEventToken).toHaveBeenCalledWith('Some event', settings);

    expect(setRevenue).toHaveBeenCalledWith(1, 'JPY');
  });

  it('sets transactionId', () => {
    const event = {
      type: 'track',
      event: 'Some event',
      anonymousId: 'anon',
      properties: {
        orderId: 1,
      },
    };

    const settings = {
      appToken: '',
      customEvents: {
        'Some event': 'token',
      },
    };

    track(event as TrackEventType, settings);

    expect(Adjust.addSessionPartnerParameter).toHaveBeenCalledWith(
      'anonymous_id',
      'anon'
    );

    // expect(mappedCustomEventToken).toHaveBeenCalledWith('Some event', settings);

    expect(setTransactionId).toHaveBeenCalledWith(1);
  });

  it('calls trackEvent correctly', () => {
    const event = {
      type: 'track',
      event: 'Some event',
      anonymousId: 'anon',
      properties: {
        orderId: 1,
      },
    };

    const settings = {
      appToken: '',
      customEvents: {
        'Some event': 'token',
      },
    };

    track(event as TrackEventType, settings);

    expect(Adjust.trackEvent).toHaveBeenCalled();
  });
});
