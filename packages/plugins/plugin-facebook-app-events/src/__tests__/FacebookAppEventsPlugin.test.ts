import {
  SegmentClient,
  SegmentEvent,
  TrackEventType,
  UpdateType,
} from '@segment/analytics-react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import { FacebookAppEventsPlugin } from '../FacebookAppEventsPlugin';

jest.mock('react-native-fbsdk-next', () => ({
  AppEventsLogger: {
    logEvent: jest.fn(),
    logPurchase: jest.fn(),
  },
  Settings: {
    initializeSDK: jest.fn(),
    setDataProcessingOptions: jest.fn(),
    setAdvertiserTrackingEnabled: jest.fn(),
  },
}));

const integrationSettings = {
  integrations: {
    'Facebook App Events': {
      appEvents: { original_event: 'new_event' },
      appId: 'facebookAppId',
      limitedDataUse: false,
      trackScreenEvents: true,
      zeroedAttribution: false,
      versionSettings: { componentTypes: ['ios', 'server'] },
      type: 'ios',
    },
  },
};

describe('FacebookAppEventsPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('configure', () => {
    const mockClient = {
      adTrackingEnabled: {
        get: jest.fn().mockReturnValue(false),
        onChange: jest.fn(),
      },
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('sets the default configuration', async () => {
      const plugin = new FacebookAppEventsPlugin();
      await plugin.configure(mockClient as unknown as SegmentClient);

      expect(Settings.initializeSDK).toHaveBeenCalled();

      // Tracking should match the client's adTrackingEnabled
      expect(Settings.setAdvertiserTrackingEnabled).not.toHaveBeenCalled();
      // Data Processing set to default
      expect(Settings.setDataProcessingOptions).toBeCalledWith([], 0, 0);
    });

    it('handles adTrackingEnabled', async () => {
      const plugin = new FacebookAppEventsPlugin();
      mockClient.adTrackingEnabled.get.mockReturnValue(true);
      await plugin.configure(mockClient as unknown as SegmentClient);

      expect(Settings.initializeSDK).toHaveBeenCalled();

      // Tracking should match the client's adTrackingEnabled
      expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenCalledWith(true);
      // Data Processing set to default
      expect(Settings.setDataProcessingOptions).toBeCalledWith([], 0, 0);
    });

    it('updates adTrackingEnabled', async () => {
      const plugin = new FacebookAppEventsPlugin();
      let callbackOnChangeAdTracking: (adTrackingEnabled: boolean) => void;

      mockClient.adTrackingEnabled.onChange.mockImplementation(
        (callback: (adTrackingEnabled: boolean) => void) => {
          callbackOnChangeAdTracking = callback;
        }
      );

      await plugin.configure(mockClient as unknown as SegmentClient);

      expect(Settings.setAdvertiserTrackingEnabled).not.toHaveBeenCalled();

      // Now switch on the adTrackingEnabled
      callbackOnChangeAdTracking!(true);

      expect(Settings.setAdvertiserTrackingEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('update', () => {
    it('sets LDU if enabled in settings', () => {
      const plugin = new FacebookAppEventsPlugin();
      plugin.update(
        {
          integrations: {
            'Facebook App Events': {
              limitedDataUse: true,
            },
          },
        },
        UpdateType.initial
      );
      expect(Settings.setDataProcessingOptions).toHaveBeenCalledWith(['LDU']);
    });
  });

  describe('track', () => {
    const plugin = new FacebookAppEventsPlugin();
    plugin.update(integrationSettings, UpdateType.initial);

    it('logs a custom event', () => {
      const payload = {
        messageId: '12345',
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
      } as SegmentEvent;

      const expected = {
        _appVersion: '1.0',
        _logTime: 1636407752,
        fb_num_items: 0,
        event_id: '12345',
      };

      plugin.track(payload as TrackEventType);

      expect(AppEventsLogger.logEvent).toHaveBeenCalledWith('ACTION', expected);
    });

    it('logs an order completed event', () => {
      const payload = {
        messageId: '12345',
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
        _logTime: 1636407752,
        event_id: '12345',
        fb_num_items: 0,
        _valueToSum: 10,
      };
      plugin.track(payload as TrackEventType);

      expect(AppEventsLogger.logPurchase).toHaveBeenCalledWith(
        10,
        'USD',
        expected
      );
    });

    it('maps event names', () => {
      const payload = {
        messageId: '12345',
        type: 'track',
        event: 'original_event',
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
        _logTime: 1636407752,
        event_id: '12345',
        fb_num_items: 0,
      };

      plugin.track(payload as TrackEventType);

      expect(AppEventsLogger.logEvent).toHaveBeenCalledWith(
        'new_event',
        expected
      );
    });

    it('skips logTime when timestamp is not a date', () => {
      const payload = {
        messageId: '12345',
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
        timestamp: 'not a date',
      };

      const expected = {
        _appVersion: '1.0',
        event_id: '12345',
        fb_num_items: 0,
      };

      plugin.track(payload as TrackEventType);

      expect(AppEventsLogger.logEvent).toHaveBeenCalledWith('ACTION', expected);
    });
  });
});
