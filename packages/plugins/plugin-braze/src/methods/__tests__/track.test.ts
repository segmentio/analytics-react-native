import type { TrackEventType } from '../../../../../core/src/types';
import track from '../track';
import {
  logCustomEvent,
  logPurchase,
  setAttributionData,
} from '../__mocks__/react-native-appboy-sdk';

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a custom event', () => {
    const payload = {
      type: 'track',
      event: 'ACTION',
    };

    track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith('ACTION', undefined);
  });

  it('logs a custom event with properties', () => {
    const payload = {
      type: 'track',
      event: 'ACTION',
      properties: {
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith('ACTION', { foo: 'bar' });
  });

  it('logs tracks an install event', () => {
    const payload = {
      type: 'track',
      event: 'Install Attributed',
    };

    track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith(
      'Install Attributed',
      undefined
    );
  });

  it('logs tracks an install event with attribution', () => {
    const payload = {
      type: 'track',
      event: 'Install Attributed',
      properties: {
        campaign: {
          source: 'source',
          name: 'name',
          ad_group: 'ad_group',
          ad_creative: 'ad_creative',
        },
      },
    };

    track(payload as TrackEventType);

    expect(setAttributionData).toHaveBeenCalledWith(
      'source',
      'name',
      'ad_group',
      'ad_creative'
    );
    expect(logCustomEvent).toHaveBeenCalledWith('Install Attributed', {
      campaign: {
        source: 'source',
        name: 'name',
        ad_group: 'ad_group',
        ad_creative: 'ad_creative',
      },
    });
  });

  it('logs an order completed event', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'USD', 1);
  });

  it('logs an order completed event in the correct currency', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        currency: 'JPY',
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'JPY', 1, {
      foo: 'bar',
    });
  });

  it('logs an order completed event with revenue', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: 399.99,
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith(
      'Order Completed',
      '399.99',
      'USD',
      1,
      {
        foo: 'bar',
      }
    );
  });

  it('logs an order completed event with revenue as string', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: '399.99',
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith(
      'Order Completed',
      '399.99',
      'USD',
      1,
      {
        foo: 'bar',
      }
    );
  });

  it('logs an order completed event with revenue as 0', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: {},
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'USD', 1, {
      foo: 'bar',
    });
  });

  it('logs an order completed event with products', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: '399.99',
        products: [
          {
            productId: '123',
            price: '399.99',
            quantity: 4,
          },
        ],
        foo: 'bar',
      },
    };

    track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('123', '399.99', 'USD', 4, {
      foo: 'bar',
    });
  });
});
