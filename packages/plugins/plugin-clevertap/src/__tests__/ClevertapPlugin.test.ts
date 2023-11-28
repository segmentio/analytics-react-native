import type {
  IdentifyEventType,
  TrackEventType,
  ScreenEventType,
} from '@segment/analytics-react-native';
import { ClevertapPlugin } from '../ClevertapPlugin';
import CleverTap from 'clevertap-react-native';
import { MockSegmentStore } from '@segment/analytics-rn-shared/__helpers__/mockSegmentStore';
import { SegmentClient } from '@segment/analytics-react-native';
import { getMockLogger } from '@segment/analytics-rn-shared/__helpers__/mockLogger';

jest.mock('clevertap-react-native');

describe('ClevertapPlugin ', () => {
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
  let plugin: ClevertapPlugin = new ClevertapPlugin();

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new ClevertapPlugin();
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
      Identity: 'user',
    };

    plugin.identify(payload);

    expect(CleverTap.profileSet).toHaveBeenCalledTimes(1);
    expect(CleverTap.profileSet).toHaveBeenCalledWith(safeTraits);
  });

  it('sends an Order Completed Event', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      userId: 'user',
      properties: {
        list_id: 'hot_deals_1',
        category: 'Deals',
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

    const products = [
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
    ];

    plugin.track(payload);

    expect(CleverTap.recordChargedEvent).toHaveBeenCalledTimes(1);
    expect(CleverTap.recordChargedEvent).toHaveBeenCalledWith(
      chargeDetails,
      products
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

    expect(CleverTap.recordEvent).toHaveBeenCalledTimes(1);
    expect(CleverTap.recordEvent).toHaveBeenCalledWith(
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

    expect(CleverTap.recordEvent).toHaveBeenCalledTimes(1);
    expect(CleverTap.recordEvent).toHaveBeenCalledWith(
      payload.name,
      payload.properties
    );
  });
});
