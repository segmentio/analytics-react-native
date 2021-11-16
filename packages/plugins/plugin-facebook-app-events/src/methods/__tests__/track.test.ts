import type { TrackEventType } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import track from '../track';

jest.mock('react-native-fbsdk-next', () => ({
  AppEventsLogger: {
    logEvent: jest.fn(),
    logPurchase: jest.fn(),
  },
}));

describe('#track', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs a custom event', () => {
    const payload = {
      type: 'track',
      event: 'ACTION',
      context: {
        app: {
          build: '1',
          name: 'Analytics',
          namespace: 'org.reactjs.native.AnalyticsReactNativeExample',
          version: '1.0',
        },
      },
      properties: {
        foo: 'bar',
      },
      timestamp: '2021-11-08T21:42:32.242Z',
    };

    const expected = {
      _appVersion: '1.0',
      _logTime: undefined,
      fb_num_items: 0,
    };

    track(payload as TrackEventType);

    expect(AppEventsLogger.logEvent).toHaveBeenCalledWith('ACTION', expected);
  });

  it('logs an order completed event', () => {
    const payload = {
      type: 'track',
      event: 'Order Completed',
      context: {
        app: {
          build: '1',
          name: 'Analytics',
          namespace: 'org.reactjs.native.AnalyticsReactNativeExample',
          version: '1.0',
        },
      },
      properties: {
        revenue: 10,
        price: 10,
      },
      timestamp: '2021-11-08T21:42:32.242Z',
    };

    const expected = {
      _appVersion: '1.0',
      _logTime: undefined,
      fb_num_items: 0,
      _valueToSum: 10,
    };
    track(payload as TrackEventType);

    expect(AppEventsLogger.logPurchase).toHaveBeenCalledWith(
      10,
      'USD',
      expected
    );
  });

  //
  //   it('logs an order completed event in the correct currency', () => {
  //     const payload = {
  //       type: 'track',
  //       event: 'Order Completed',
  //       properties: {
  //         currency: 'JPY',
  //         foo: 'bar',
  //       },
  //     };
  //
  //     track(payload as TrackEventType);
  //
  //     expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'JPY', 1, {
  //       foo: 'bar',
  //     });
  //   });
  //
  //   it('logs an order completed event with revenue', () => {
  //     const payload = {
  //       type: 'track',
  //       event: 'Order Completed',
  //       properties: {
  //         revenue: 399.99,
  //         foo: 'bar',
  //       },
  //     };
  //
  //     track(payload as TrackEventType);
  //
  //     expect(logPurchase).toHaveBeenCalledWith(
  //       'Order Completed',
  //       '399.99',
  //       'USD',
  //       1,
  //       {
  //         foo: 'bar',
  //       }
  //     );
  //   });
  //
  //   it('logs an order completed event with revenue as string', () => {
  //     const payload = {
  //       type: 'track',
  //       event: 'Order Completed',
  //       properties: {
  //         revenue: '399.99',
  //         foo: 'bar',
  //       },
  //     };
  //
  //     track(payload as TrackEventType);
  //
  //     expect(logPurchase).toHaveBeenCalledWith(
  //       'Order Completed',
  //       '399.99',
  //       'USD',
  //       1,
  //       {
  //         foo: 'bar',
  //       }
  //     );
  //   });
  //
  //   it('logs an order completed event with revenue as 0', () => {
  //     const payload = {
  //       type: 'track',
  //       event: 'Order Completed',
  //       properties: {
  //         revenue: {},
  //         foo: 'bar',
  //       },
  //     };
  //
  //     track(payload as TrackEventType);
  //
  //     expect(logPurchase).toHaveBeenCalledWith('Order Completed', '0', 'USD', 1, {
  //       foo: 'bar',
  //     });
  //   });
  //
  //   it('logs an order completed event with products', () => {
  //     const payload = {
  //       type: 'track',
  //       event: 'Order Completed',
  //       properties: {
  //         revenue: '399.99',
  //         products: [
  //           {
  //             productId: '123',
  //             price: '399.99',
  //             quantity: 4,
  //           },
  //         ],
  //         foo: 'bar',
  //       },
  //     };
  //
  //     track(payload as TrackEventType);
  //
  //     expect(logPurchase).toHaveBeenCalledWith('123', '399.99', 'USD', 4, {
  //       foo: 'bar',
  //     });
  //   });
});
