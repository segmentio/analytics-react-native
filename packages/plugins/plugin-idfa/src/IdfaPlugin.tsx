import {
  ErrorType,
  Plugin,
  PluginType,
  SegmentClient,
  SegmentError,
} from '@segment/analytics-react-native';
import type { IdfaData } from './types';
import { AnalyticsReactNativePluginIdfa } from './AnalyticsReactNativePluginIdfa';
import { Platform } from 'react-native';

const { getTrackingAuthorizationStatus } = AnalyticsReactNativePluginIdfa;

/**
 * IDFA Plugin
 * @constructor
 * @param {boolean} shouldAskPermission - defaults to true. Passing false
 *  when initializing new `IDFA Plugin` will prevent plugin from
 * requesting tracking status
 */

export class IdfaPlugin extends Plugin {
  type = PluginType.enrichment;

  private shouldAskPermission = true;

  constructor(shouldAskPermission = true) {
    super();
    this.shouldAskPermission = shouldAskPermission;
  }

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;
    if (Platform.OS !== 'ios') {
      return;
    }

    if (this.shouldAskPermission === true) {
      this.getTrackingStatus();
    }
  }

  /** `requestTrackingPermission()` will prompt the user for
tracking permission and returns a promise you can use to
make additional tracking decisions based on the user response
*/
  async requestTrackingPermission(): Promise<boolean> {
    try {
      const idfaData: IdfaData = await getTrackingAuthorizationStatus();

      await this.analytics?.context.set({ device: { ...idfaData } });
      return idfaData.adTrackingEnabled;
    } catch (error) {
      this.analytics?.reportInternalError(
        new SegmentError(ErrorType.PluginError, JSON.stringify(error), error)
      );
      this.analytics?.logger.warn(error);
      return false;
    }
  }

  getTrackingStatus() {
    getTrackingAuthorizationStatus()
      .then((idfa: IdfaData) => {
        // update our context with the idfa data
        void this.analytics?.context.set({ device: { ...idfa } });
        return idfa;
      })
      .catch((error) => {
        this.analytics?.reportInternalError(
          new SegmentError(
            ErrorType.PluginError,
            'Error retreiving IDFA',
            error
          )
        );
        this.analytics?.logger.warn(error);
      });
  }
}
