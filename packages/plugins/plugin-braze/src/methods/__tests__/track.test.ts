import type { TrackEventType } from '../../../../../core/src/types';
import { BrazePlugin } from '../../BrazePlugin';
import {
  logCustomEvent,
  logPurchase,
  setAttributionData,
} from '../__mocks__/@braze/react-native-sdk';
import { UpdateType } from '../../../../../core/src/types';

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a custom event', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'ACTION',
    };

    plugin.track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith('ACTION', undefined);
  });

  it('logs a custom event with properties', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'ACTION',
      properties: {
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith('ACTION', { foo: 'bar' });
  });

  it('logs tracks an install event', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Install Attributed',
    };

    plugin.track(payload as TrackEventType);

    expect(logCustomEvent).toHaveBeenCalledWith(
      'Install Attributed',
      undefined
    );
  });

  it('logs tracks an install event with attribution', () => {
    const plugin = new BrazePlugin();
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

    plugin.track(payload as TrackEventType);

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

  it('tracks an Application Installed event when a value is null', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Install Attributed',
      properties: {
        campaign: {
          source: 'source',
          name: 'name',
          ad_group: null,
          ad_creative: 'ad_creative',
        },
      },
    };

    plugin.track(payload as TrackEventType);

    expect(setAttributionData).toHaveBeenCalledWith(
      'source',
      'name',
      '',
      'ad_creative'
    );
    expect(logCustomEvent).toHaveBeenCalledWith('Install Attributed', {
      campaign: {
        source: 'source',
        name: 'name',
        ad_group: null,
        ad_creative: 'ad_creative',
      },
    });
  });

  it('tracks an Application Installed event when a value is undefined/missing', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Install Attributed',
      properties: {
        campaign: {
          source: 'source',
          name: 'name',
          //missing value
          // ad_group: null,
          ad_creative: 'ad_creative',
        },
      },
    };

    plugin.track(payload as TrackEventType);

    expect(setAttributionData).toHaveBeenCalledWith(
      'source',
      'name',
      '',
      'ad_creative'
    );
    expect(logCustomEvent).toHaveBeenCalledWith('Install Attributed', {
      campaign: {
        source: 'source',
        name: 'name',
        ad_creative: 'ad_creative',
      },
    });
  });

  it('logs an order completed event', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
    };

    plugin.track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'USD', 1);
  });

  it('logs an order completed event in the correct currency', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        currency: 'JPY',
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'JPY', 1, {
      foo: 'bar',
    });
  });

  it('logs an order completed event with revenue', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: 399.99,
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

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
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: '399.99',
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

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
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: {},
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'USD', 1, {
      foo: 'bar',
    });
  });

  it('logs an order completed event with products', () => {
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'Order Completed',
      properties: {
        revenue: '399.99',
        products: [
          {
            product_id: '123',
            price: '399.99',
            quantity: 4,
          },
        ],
        foo: 'bar',
      },
    };

    plugin.track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('123', '399.99', 'USD', 4, {
      foo: 'bar',
    });
  });

  it('logs a revenue event if `revenueEnabled` setting is true', () => {
    const settings = {
      integrations: { Appboy: { logPurchaseWhenRevenuePresent: true } },
    };
    const updateType: UpdateType = UpdateType.initial;
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'RevenueTest',
      properties: {
        revenue: 34,
        foo: 'bar',
      },
    };
    plugin.update(settings, updateType);
    plugin.track(payload as TrackEventType);

    expect(logPurchase).toHaveBeenCalledWith('RevenueTest', '34', 'USD', 1, {
      foo: 'bar',
    });
  });

  it('logs a custom event when revenue is 0', () => {
    const settings = {
      integrations: { Appboy: { logPurchaseWhenRevenuePresent: true } },
    };
    const updateType: UpdateType = UpdateType.initial;
    const plugin = new BrazePlugin();
    const payload = {
      type: 'track',
      event: 'RevenueTest',
      properties: {
        revenue: 0,
        foo: 'bar',
      },
    };
    plugin.update(settings, updateType);
    plugin.track(payload as TrackEventType);

    expect(logCustomEvent).toBeCalledWith('RevenueTest', {
      revenue: 0,
      foo: 'bar',
    });
  });
});
