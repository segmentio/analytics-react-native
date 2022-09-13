import {
  Plugin,
  PluginType,
  SegmentClient,
} from '@segment/analytics-react-native';
import type { IdfaData } from './types';
import { AnalyticsReactNativePluginIdfa } from './AnalyticsReactNativePluginIdfa';

const { getTrackingAuthorizationStatus } = AnalyticsReactNativePluginIdfa;

export class IdfaPlugin extends Plugin {
  type = PluginType.enrichment;
  private isEnabled?: boolean = false;
  private isDisabled?: boolean;

  constructor(enabled?: boolean) {
    super();
    if (enabled === false) {
      this.isDisabled = true;
    }

    if (this.isDisabled !== true) {
      this.getTrackingStatus();
    }
  }

  configure(analytics: SegmentClient) {
    this.analytics = analytics;

    // since configure can be called multiple times potentially
    // this accounts for both enabling and disabling plugin
    if (this.isEnabled === false && this.isDisabled !== true) {
      this.getTrackingStatus();
    }
  }

  async enable(): Promise<boolean> {
    try {
      let idfaData: IdfaData = await getTrackingAuthorizationStatus();

      this.analytics?.context.set({ device: { ...idfaData } });
      return idfaData.adTrackingEnabled;
    } catch (error) {
      this.analytics?.logger.warn(error);
      return false;
    }
  }

  //not sure we actually need this
  disable() {
    this.isDisabled = true;
  }

  getTrackingStatus() {
    getTrackingAuthorizationStatus()
      .then((idfa: IdfaData) => {
        // update our context with the idfa data
        this.analytics?.context.set({ device: { ...idfa } });
        this.isEnabled = true;
        return idfa;
      })
      .catch((err: any) => {
        this.analytics?.logger.warn(err);
      });
  }
}
