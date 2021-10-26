import { IdfaData, TrackingStatus } from './types';

const AnalyticsReactNativePluginIdfa = {
  getTrackingAuthorizationStatus: async (): Promise<IdfaData> => {
    return {
      adTrackingEnabled: false,
      advertisingId: 'trackMeId',
      trackingStatus: TrackingStatus.Denied,
    };
  },
};
export { AnalyticsReactNativePluginIdfa };
