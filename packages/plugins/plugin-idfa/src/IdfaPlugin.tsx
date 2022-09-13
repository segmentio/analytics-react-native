import { Plugin, PluginType } from '@segment/analytics-react-native';
import type { IdfaData } from './types';
import { AnalyticsReactNativePluginIdfa } from './AnalyticsReactNativePluginIdfa';

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

  constructor(shouldAskPermission: boolean = true) {
    super();

    if (shouldAskPermission === true) {
      this.getTrackingStatus();
    }
  }

  /** `requestTrackingPermission()` will prompt the user for 
tracking permission and returns a promise you can use to 
make additional tracking decisions based on the user response 
*/
  async requestTrackingPermission(): Promise<boolean> {
    try {
      let idfaData: IdfaData = await getTrackingAuthorizationStatus();

      this.analytics?.context.set({ device: { ...idfaData } });
      return idfaData.adTrackingEnabled;
    } catch (error) {
      this.analytics?.logger.warn(error);
      return false;
    }
  }

  getTrackingStatus() {
    getTrackingAuthorizationStatus()
      .then((idfa: IdfaData) => {
        // update our context with the idfa data
        this.analytics?.context.set({ device: { ...idfa } });
        return idfa;
      })
      .catch((err: any) => {
        this.analytics?.logger.warn(err);
      });
  }
}
