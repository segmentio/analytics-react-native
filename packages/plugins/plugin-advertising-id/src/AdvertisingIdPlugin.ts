import {
  Plugin,
  PluginType,
  SegmentClient,
  getNativeModule,
  ErrorType,
  SegmentError,
  SegmentEvent,
  EventType,
  TrackEventType,
} from '@segment/analytics-react-native';

import { Platform, NativeModule } from 'react-native';

type AdvertisingIDNativeModule = NativeModule & {
  getAdvertisingId: () => Promise<string>;
  getIsLimitAdTrackingEnableStatus: () => Promise<boolean>;
};

export class AdvertisingIdPlugin extends Plugin {
  type = PluginType.enrichment;
  queuedEvents: SegmentEvent[] = [];
  advertisingId: string | undefined | null = undefined;
  isLimitAdTracking?: boolean = undefined;

  configure(analytics: SegmentClient): void {
    if (Platform.OS !== 'android') {
      return;
    }

    this.analytics = analytics;
    this.fetchAdvertisingInfo()
      .then(() => {
        // Additional logic after the advertising info is fetched
        this.sendQueued();
      })
      .catch((error) => {
        this.handleError(error);
      });
  }

  async execute(event: SegmentEvent) {
    // Exit early for non-Android platforms
    if (Platform.OS !== 'android') {
      return event;
    }

    // If advertisingId is not set, queue the event
    if (this.advertisingId === undefined) {
      this.queuedEvents.push(event);
      return;
    }

    // Check current Limit Ad Tracking status
    const currentLimitAdTrackingStatus =
      await this.fetchLimitAdTrackingStatus();

    // Initialize tracking status if undefined
    if (this.isLimitAdTracking === undefined) {
      this.isLimitAdTracking = currentLimitAdTrackingStatus;
      return event;
    }

    // If tracking status has changed, refresh ad info and queue event
    if (this.isLimitAdTracking !== currentLimitAdTrackingStatus) {
      try {
        await this.fetchAdvertisingInfo();
        console.log(
          'Advertising info fetched successfully when adTrackingStatus Changed.'
        );
      } catch (error) {
        this.handleError(error);
      }

      this.queuedEvents.push(event);
      this.isLimitAdTracking = currentLimitAdTrackingStatus;
      this.sendQueued();
      return;
    }

    // Default return
    return event;
  }

  isTrackEvent(event: SegmentEvent): event is TrackEventType {
    return event.type === EventType.TrackEvent;
  }

  private async fetchAdvertisingInfo(): Promise<void> {
    const advertisingIdPromise = this.fetchAdvertisingId();
    const limitAdTrackingStatusPromise = this.fetchLimitAdTrackingStatus();

    try {
      // eslint-disable-next-line prefer-const
      let [id, status] = await Promise.all([
        advertisingIdPromise,
        limitAdTrackingStatusPromise,
      ]);
      // Handle null status (e.g., native failure) by assuming enabled if id null
      if (id === null && status === null) {
        status = true; // Assume enabled on failure
      }

      if (id === null) {
        this.advertisingId = null; // CHANGED: Use null for unavailable, not undefined
      } else {
        this.advertisingId = id;
      }

      // NEW: Set isLimitAdTracking here to ensure initialization
      this.isLimitAdTracking = status ?? true; // Default to true on null

      await this.setContext(id ?? undefined, status ?? true); // CHANGED: Handle nulls safely
    } catch (error) {
      this.handleError(error);
    }
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
    } catch (error) {
      const message = 'AdvertisingID failed to set context';
      this.analytics?.reportInternalError(
        new SegmentError(ErrorType.PluginError, message, error)
      );
      this.analytics?.logger.warn(`${message}: ${JSON.stringify(error)}`);
    }
  }

  sendQueued() {
    console.log('Sending queued events:', this.queuedEvents);
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
