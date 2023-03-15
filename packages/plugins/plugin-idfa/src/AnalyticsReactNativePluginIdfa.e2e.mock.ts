import { IdfaData, TrackingStatus } from './types';

const AnalyticsReactNativePluginIdfa = {
  getTrackingAuthorizationStatus: async (): Promise<IdfaData> => {
    return Promise.resolve({
      adTrackingEnabled: false,
      advertisingId: 'trackMeId',
      trackingStatus: TrackingStatus.Denied,
    });
  },
};
export { AnalyticsReactNativePluginIdfa };
