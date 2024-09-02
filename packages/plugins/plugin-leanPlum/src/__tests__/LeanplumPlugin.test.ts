import { SegmentClient } from '@segment/analytics-react-native';
import {
  getMockLogger,
  MockSegmentStore,
} from '@segment/analytics-react-native/src/test-helpers';

import { Leanplum } from '@leanplum/react-native-sdk';

import { LeanplumPlugin } from '../LeanplumPlugin';
import type {
  IdentifyEventType,
  TrackEventType,
  ScreenEventType,
} from '@segment/analytics-react-native';

jest.mock('@leanplum/react-native-sdk', () => require('../__mocks__/leanplum-react-native'));

describe('LeanplumPlugin', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      trackApplicationLifecycleEvents: true,
      flushInterval: 0,
    },
    store,
  };
  let plugin: LeanplumPlugin = new LeanplumPlugin();

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new LeanplumPlugin();
    plugin.analytics = new SegmentClient(clientArgs);
  });

  it('sends an identify event with correct traits', () => {
    const payload = {
      type: 'identify',
      traits: {
        name: 'John',
        phone: '(555) 555-5555',
        foo: 'bar',
      },
      userId: 'user',
    } as IdentifyEventType;

    const safeTraits = {
      Name: 'John',
      Phone: '(555) 555-5555',
      foo: 'bar',
      userId: 'user',
    };

    plugin.identify(payload);

    expect(Leanplum.setUserAttributes).toHaveBeenCalledTimes(1);
    expect(Leanplum.setUserAttributes).toHaveBeenCalledWith(safeTraits);
  });

  it('sends an Order Completed Event', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      userId: 'user',
      properties: {
        list_id: 'hot_deals_1',
        category: 'Deals',
        revenue: '399.99',
        currency: 'USD',
        products: [
          {
            product_id: '507f1f77bcf86cd799439011',
            sku: '45790-32',
            name: 'Monopoly: 3rd Edition',
            price: 19,
            position: 1,
            category: 'Games',
            url: 'https://www.example.com/product/path',
            image_url: 'https://www.example.com/product/path.jpg',
          },
          {
            product_id: '505bd76785ebb509fc183733',
            sku: '46493-32',
            name: 'Uno Card Game',
            price: 3,
            position: 2,
            category: 'Games',
          },
        ],
      },
    } as TrackEventType;

    const chargeDetails = {
      list_id: 'hot_deals_1',
      category: 'Deals',
      Identity: 'user',
    };

    const sanitizedRevenue = 399.99;
    const sanitizedCurrency = 'USD';

    plugin.track(payload);

    expect(Leanplum.trackPurchase).toHaveBeenCalledTimes(1);
    expect(Leanplum.trackPurchase).toHaveBeenCalledWith(
      sanitizedRevenue,
      sanitizedCurrency,
      { ...chargeDetails, products: JSON.stringify(payload.properties?.products) },
      'Order Completed'
    );
  });

  it('sends a track event', () => {
    const payload = {
      type: 'track',
      event: 'track user',
      userId: 'user',
      properties: {
        foo: 'bar',
      },
    } as TrackEventType;

    plugin.track(payload);

    expect(Leanplum.track).toHaveBeenCalledTimes(1);
    expect(Leanplum.track).toHaveBeenCalledWith(
      payload.event,
      payload.properties
    );
  });

  it('sends a screen event', () => {
    const payload = {
      type: 'screen',
      properties: {
        isFirstTime: true,
        foo: 'bar',
      },
      name: 'Home',
    } as ScreenEventType;

    plugin.screen(payload);

    expect(Leanplum.advanceTo).toHaveBeenCalledTimes(1);
    expect(Leanplum.advanceTo).toHaveBeenCalledWith(
      payload.name,
      undefined,
      payload.properties
    );
  });
});
