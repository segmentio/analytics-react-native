import {
  Plugin,
  PluginType,
  SegmentClient,
} from '@segment/analytics-react-native';
import { IdfaEvents } from './IdfaEvents';
import type { IdfaData } from './types';
import { AnalyticsReactNativePluginIdfa } from './AnalyticsReactNativePluginIdfa';

const { getTrackingAuthorizationStatus } = AnalyticsReactNativePluginIdfa;

export class IdfaPlugin extends Plugin {
  type = PluginType.enrichment;
  private trackingStatusRequested: boolean = false;

  constructor() {
    super();
    getTrackingAuthorizationStatus().then((idfa: IdfaData) => {
      if (
        idfa.trackingStatus === 'notDetermined' ||
        idfa.trackingStatus === 'unknown'
      ) {
        IdfaEvents.addListener('IDFAQuery', (res) => {
          this.getTrackingStatus();
          console.log('idfa status not determined', res);
        });
      } else {
        IdfaEvents.addListener('IDFAQuery', (res) => {
          this.trackingStatusRequested = true;
          this.analytics?.track('IDFAQuery', res);
        });
      }
    });
  }

  configure(analytics: SegmentClient) {
    this.analytics = analytics;

    if (this.trackingStatusRequested === false) {
      this.getTrackingStatus();
      this.trackingStatusRequested = true;
    }
  }

  getTrackingStatus() {
    getTrackingAuthorizationStatus()
      .then((idfa: IdfaData) => {
        console.log('idfaData', idfa);
        // update our context with the idfa data
        this.analytics?.context.set({ device: { ...idfa } });
      })
      .catch((err: any) => {
        console.warn(err);
      });
  }
}
