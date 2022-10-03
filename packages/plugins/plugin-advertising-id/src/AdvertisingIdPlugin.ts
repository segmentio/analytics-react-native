//@ts-ignore
import {
  Plugin,
  PluginType,
  SegmentClient,
  getNativeModule
} from '@segment/analytics-react-native';

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;
    getNativeModule('AnalyticsReactNativePluginAdvertisingId')
      ?.getAdvertisingId()
      .then((id: string) => {
        if (id === null) {
          analytics.track(
            'LimitAdTrackingEnabled (Google Play Services) is enabled'
          );
        } else {
          this.setContext(id);
        }
      });
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
