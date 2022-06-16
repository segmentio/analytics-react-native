//@ts-ignore
import { Plugin, PluginType } from '@segment/analytics-react-native';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';
import type { AdvertisingIdData } from './types';

import { NativeModules } from 'react-native';

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;

    NativeModules.AnalyticsReactNativePluginAdvertisingId.getAdvertisingId().then(
      (id: string) => {
        console.log('advertisingId', id);
        if (id === null) {
          analytics.track(
            'LimitAdTrackingEnabled (Google Play Services) is true'
          );
        } else {
          this.setContext({ id });
        }
      }
    );
  }

  setContext(adIdData: AdvertisingIdData) {
    this.analytics?.context.set({
      device: {
        advertisingId: adIdData.id,
        adTrackingEnabled: true,
      },
    });
  }
}
