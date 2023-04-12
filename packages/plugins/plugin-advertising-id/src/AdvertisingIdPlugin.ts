import {
  Plugin,
  PluginType,
  SegmentClient,
  getNativeModule,
  ErrorType,
  SegmentError,
} from '@segment/analytics-react-native';

import { Platform, NativeModule } from 'react-native';

type AdvertisingIDNativeModule = NativeModule & {
  getAdvertisingId: () => Promise<string>;
};

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient): void {
    if (Platform.OS !== 'android') {
      return;
    }

    this.analytics = analytics;
    (
      getNativeModule(
        'AnalyticsReactNativePluginAdvertisingId'
      ) as AdvertisingIDNativeModule
    )
      ?.getAdvertisingId()
      .then((id: string) => {
        if (id === null) {
          void analytics.track(
            'LimitAdTrackingEnabled (Google Play Services) is enabled'
          );
        } else {
          void this.setContext(id);
        }
      })
      .catch((error) => {
        this.analytics?.reportInternalError(
          new SegmentError(
            ErrorType.PluginError,
            'Error retrieving AdvertisingID',
            error
          )
        );
      });
  }

  async setContext(id: string): Promise<void> {
    try {
      await this.analytics?.context.set({
        device: {
          advertisingId: id,
          adTrackingEnabled: true,
        },
      });
    } catch (error) {
      const message = 'AdvertisingID failed to set context';
      this.analytics?.reportInternalError(
        new SegmentError(ErrorType.PluginError, message, error)
      );
      this.analytics?.logger.warn(`${message}: ${JSON.stringify(error)}`);
    }
  }
}
