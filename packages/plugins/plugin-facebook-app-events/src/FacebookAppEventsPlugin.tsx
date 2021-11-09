import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  SegmentAPISettings,
  UpdateType,
  IntegrationSettings,
} from '@segment/analytics-react-native';
import track from './methods/track';
import screen from './methods/screen';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';

import { Settings } from 'react-native-fbsdk-next';

interface FBPluginSettings extends Record<string, any> {
  trackScreenEvent: boolean;
}

const isFBPluginSettings = (
  settings: IntegrationSettings
): settings is FBPluginSettings => {
  return (
    typeof settings === 'object' && 'trackScreenEvent' in Object.keys(settings)
  );
};

export class FacebookAppEventsPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Facebook App Events';
  trackScreens = false;

  async configure(analytics: SegmentClient) {
    this.analytics = analytics;
    let adTrackingEnabled =
      this.analytics?.store.getState().main.context?.device?.adTrackingEnabled;

    this.analytics.watch(
      (state): boolean =>
        state.main.context?.device?.adTrackingEnabled ?? false,
      (value) => {
        Settings.setAdvertiserTrackingEnabled(value);
      }
    );

    //you will likely need consent first
    //this example assumes consentManager plugin is used
    await Settings.initializeSDK();

    if (adTrackingEnabled) {
      try {
        await Settings.setAdvertiserTrackingEnabled(true);
      } catch (e) {
        //handle error
        console.log('Add Tracking Enabled Error', e);
      }
    }

    //default facebook data processing options
    Settings.setDataProcessingOptions([], 0, 0);
  }

  update(settings: SegmentAPISettings, _: UpdateType) {
    const fbSettings = settings.integrations[this.key];

    if (isFBPluginSettings(fbSettings)) {
      this.trackScreens = fbSettings.trackScreenEvent;
    }
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  screen(event: ScreenEventType) {
    if (this.trackScreens === true) {
      screen(event);
    }
    return event;
  }
}
