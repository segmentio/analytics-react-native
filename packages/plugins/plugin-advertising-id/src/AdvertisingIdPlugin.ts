import {
  Plugin,
  PluginType,
  SegmentClient,
  getNativeModule,
  ErrorType,
  SegmentError,
  SegmentEvent,
} from '@segment/analytics-react-native';

import { Platform, NativeModule } from 'react-native';

type AdvertisingIDNativeModule = NativeModule & {
  getAdvertisingId: () => Promise<string>;
  getIsLimitAdTrackingEnableStatus: () => Promise<boolean>;
};

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;
  queuedEvents: SegmentEvent[] = [];
  advertisingId?: string = undefined;
  isLimitAdTracking?: boolean = false;

  configure(analytics: SegmentClient): void {
    if (Platform.OS !== 'android') {
      return;
    }

    this.analytics = analytics;
    // Create an array of promises for fetching advertising ID and limit ad tracking status
    const advertisingIdPromise = this.fetchAdvertisingId();
    const limitAdTrackingStatusPromise = this.fetchLimitAdTrackingStatus();
    // Wait for both promises to resolve
    Promise.all([advertisingIdPromise, limitAdTrackingStatusPromise])
      .then(([id, status]) => {
        //handle advertisingID
        if (id === null) {
          // Need to check this condition
          void analytics.track(
            'LimitAdTrackingEnabled (Google Play Services) is enabled'
          );
        } else {
          this.advertisingId = id;
        }
        //handle isLimitAdTrackingEnableStatus
        this.isLimitAdTracking = status;

        // Call setContext after both values are available
        void this.setContext(this.advertisingId, status);
      })
      .catch((error) => this.handleError(error));
  }

  execute(event: SegmentEvent) {
    if (this.advertisingId === undefined) {
      this.queuedEvents.push(event);
    } else {
      return event;
    }
    return;
  }

  async setContext(
    id: string | undefined,
    isLimitAdTrackingEnableStatus: boolean
  ): Promise<void> {
    try {
      await this.analytics?.context.set({
        device: {
          advertisingId: id,
          adTrackingEnabled: !isLimitAdTrackingEnableStatus,
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
    this.queuedEvents.forEach((event) => {
      void this.analytics?.process(event);
    });
    this.queuedEvents = [];
  }

  private fetchAdvertisingId(): Promise<string | null> {
    return (
      getNativeModule(
        'AnalyticsReactNativePluginAdvertisingId'
      ) as AdvertisingIDNativeModule
    )?.getAdvertisingId();
  }

  private fetchLimitAdTrackingStatus(): Promise<boolean> {
    return (
      getNativeModule(
        'AnalyticsReactNativePluginAdvertisingId'
      ) as AdvertisingIDNativeModule
    )?.getIsLimitAdTrackingEnableStatus();
  }

  private handleError(error: unknown): void {
    this.analytics?.reportInternalError(
      new SegmentError(
        ErrorType.PluginError,
        'Error retrieving AdvertisingID',
        error
      )
    );
  }
}
