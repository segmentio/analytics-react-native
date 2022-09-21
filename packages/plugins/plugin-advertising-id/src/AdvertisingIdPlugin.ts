//@ts-ignore
import {
  Plugin,
  PluginType,
  SegmentClient,
} from '@segment/analytics-react-native';
import { warnMissingNativeModule } from '@segment/analytics-react-native/src/util';
import { NativeModules } from 'react-native';

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;
    if (NativeModules.AnalyticsReactNativePluginAdvertisingId) {
      NativeModules.AnalyticsReactNativePluginAdvertisingId.getAdvertisingId().then(
        (id: string) => {
          if (id === null) {
            analytics.track(
              'LimitAdTrackingEnabled (Google Play Services) is enabled'
            );
          } else {
            this.setContext(id);
          }
        }
      );
    } else {
      warnMissingNativeModule();
    }
  }

  setContext(id: string) {
    this.analytics?.context.set({
      device: {
        advertisingId: id,
        adTrackingEnabled: true,
      },
    });
  }
}
