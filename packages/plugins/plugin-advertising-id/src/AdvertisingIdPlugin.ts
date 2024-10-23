import {
  Plugin,
  PluginType,
  SegmentClient,
  getNativeModule,
  ErrorType,
  SegmentError,
  SegmentEvent
} from '@segment/analytics-react-native';

import { Platform, NativeModule } from 'react-native';

type AdvertisingIDNativeModule = NativeModule & {
  getAdvertisingId: () => Promise<string>;
};

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;
  queuedEvents: SegmentEvent[] = [];
  advertisingId?: string = undefined;

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
          this.advertisingId = id
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

  execute(event: SegmentEvent){

    if (this.advertisingId === undefined) {
      this.queuedEvents.push(event);
    }else{
      return event;
    }
    return;
  }

  async setContext(id: string): Promise<void> {
    try {
      await this.analytics?.context.set({
        device: {
          advertisingId: id,
          adTrackingEnabled: true,
        },
      });
      this.sendQueued();
    } catch (error) {
      const message = 'AdvertisingID failed to set context';
      this.analytics?.reportInternalError(
        new SegmentError(ErrorType.PluginError, message, error)
      );
      this.analytics?.logger.warn(`${message}: ${JSON.stringify(error)}`);
    }
  }

  sendQueued() {
    this.queuedEvents.forEach(event => {
      void this.analytics?.process(event);
    });
    this.queuedEvents = [];
  }
}
