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
    console.log('configure');
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
    // If advertisingId is not set, queue the event
    if (this.advertisingId === undefined) {
      this.queuedEvents.push(event);
    } else {
      // Send event if advertisingId is available
      const currentLimitAdTrackingStatus =
        await this.fetchLimitAdTrackingStatus();
      if (this.isLimitAdTracking === undefined) {
        this.isLimitAdTracking = currentLimitAdTrackingStatus;
      } else if (this.isLimitAdTracking !== currentLimitAdTrackingStatus) {
        //Fetch the fresh advertising id
        await this.fetchAdvertisingInfo()
          .then(() => {
            console.log(
              'Advertising info fetched successfully when adTrackingStatus Changed.'
            );
            // Additional logic after the advertising info is fetched
          })
          .catch((error) => {
            this.handleError(error);
          });
        this.queuedEvents.push(event);
        this.isLimitAdTracking = currentLimitAdTrackingStatus;
        this.sendQueued();
        return;
      }
      return event;
    }

    return;
  }

  isTrackEvent(event: SegmentEvent): event is TrackEventType {
    return event.type === EventType.TrackEvent;
  }

  private async fetchAdvertisingInfo(): Promise<void> {
    const advertisingIdPromise = this.fetchAdvertisingId();
    const limitAdTrackingStatusPromise = this.fetchLimitAdTrackingStatus();

    try {
      // Await both promises to resolve simultaneously
      const [id, status] = await Promise.all([
        advertisingIdPromise,
        limitAdTrackingStatusPromise,
      ]);

      // Handle advertisingID
      if (id === null) {
        void this.analytics?.track(
          'LimitAdTrackingEnabled (Google Play Services) is enabled'
        );
        this.advertisingId = undefined; // Set to undefined if id is null
      } else {
        this.advertisingId = id;
      }

      // Set context after both values are available
      await this.setContext(id as string, status);
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
