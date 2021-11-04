import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
} from '@segment/analytics-react-native';
import track from './methods/track';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';

import { Settings } from 'react-native-fbsdk-next';

export class FacebookAppEventsPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'FacebookAppEvents';

  async configure(analytics: SegmentClient) {
    this.analytics = analytics;
    let adTrackingEnabled =
      this.analytics?.store.getState().main.context?.device?.adTrackingEnabled;

    if (adTrackingEnabled) {
      await Settings.setAdvertiserTrackingEnabled(true);
    }

    //you will likely need consent first
    //this example assumes consentManager plugin is used
    await Settings.initializeSDK();

    //default facebook data processing options
    Settings.setDataProcessingOptions([], 0, 0);
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }
}
