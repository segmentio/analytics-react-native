import { Plugin, PluginType } from '@segment/analytics-react-native';
import type { SegmentClient } from '../../../core/src/analytics';
import { IdfaEvents } from './IdfaEvents';
import type { IdfaData } from './types';
import { AnalyticsReactNativePluginIdfa } from './AnalyticsReactNativePluginIdfa';

const { getTrackingAuthorizationStatus } = AnalyticsReactNativePluginIdfa;

export class IdfaPlugin extends Plugin {
  type = PluginType.enrichment;

  configure(analytics: SegmentClient) {
    this.analytics = analytics;

    this.getTrackingStatus();

    // subscribe to IDFAQuery event
    // emitted when we prompt a user for permission
    IdfaEvents.addListener('IDFAQuery', (res) => {
      this.getTrackingStatus();
      this.analytics?.track('IDFAQuery', res);
    });
  }

  getTrackingStatus() {
    getTrackingAuthorizationStatus()
      .then((idfa: IdfaData) => {
        // update our context with the idfa data
        this.analytics?.context.set({ device: { ...idfa } });
      })
      .catch((err: any) => {
        console.warn(err);
      });
  }
}
