import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  SegmentAdjustSettings,
  SegmentAPISettings,
  UpdateType,
} from '@segment/analytics-react-native';
import { Adjust, AdjustConfig } from 'react-native-adjust';
import identify from './methods/identify';
import track from './methods/track';
import reset from './methods/reset';

export class AdjustPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Adjust';

  private settings: SegmentAdjustSettings | null = null;
  private hasRegisteredCallback = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const adjustSettings = settings.integrations[
      this.key
    ] as SegmentAdjustSettings;

    if (adjustSettings === undefined || adjustSettings === null) {
      return;
    }

    this.settings = adjustSettings;

    const environment =
      this.settings.setEnvironmentProduction === true
        ? 'production'
        : 'sandbox';

    const adjustConfig = new AdjustConfig(this.settings.appToken, environment);

    if (this.hasRegisteredCallback === false) {
      adjustConfig.setAttributionCallback((attribution) => {
        const trackPayload = {
          provider: 'Adjust',
          trackerToken: attribution.trackerToken,
          trackerName: attribution.trackerName,
          campaign: {
            source: attribution.network,
            name: attribution.campaign,
            content: attribution.clickLabel,
            adCreative: attribution.creative,
            adGroup: attribution.adgroup,
          },
        };
        void this.analytics?.track('Install Attributed', trackPayload);
      });
      this.hasRegisteredCallback = true;
    }
    //Removed from react-native-adjust v5 (https://dev.adjust.com/en/sdk/migration/react-native/v4-to-v5)
    //TO DO : Remove commented lines in next release
    // const bufferingEnabled = this.settings.setEventBufferingEnabled;
    // if (bufferingEnabled === true) {
    //   adjustConfig.setEventBufferingEnabled(bufferingEnabled);
    // }

    // const useDelay = this.settings.setDelay;
    // if (useDelay === true) {
    //   const delayTime = this.settings.delayTime;
    //   if (delayTime !== null && delayTime !== undefined) {
    //     adjustConfig.setDelayStart(delayTime);
    //   }
    // }

    //create has been replaced with initSDK in v5
    //TO DO : Remove commented lines in next release
    //Adjust.create(adjustConfig);
    Adjust.initSdk(adjustConfig);
  }
  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    track(event, this.settings!);
    return event;
  }

  reset() {
    reset();
  }
}
