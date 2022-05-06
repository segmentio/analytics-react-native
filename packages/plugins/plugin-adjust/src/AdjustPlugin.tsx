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
  private hasRegisteredCallback: boolean = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const adjustSettings = settings.integrations[
      this.key
    ] as SegmentAdjustSettings;

    if (!adjustSettings) {
      return;
    }

    this.settings = adjustSettings;

    const environment = this.settings.setEnvironmentProduction
      ? 'production'
      : 'sandbox';

    const adjustConfig = new AdjustConfig(this.settings.appToken, environment);

    if (this.hasRegisteredCallback === false) {
      adjustConfig.setAttributionCallbackListener((attribution) => {
        let trackPayload = {
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
        this.analytics?.track('Install Attributed', trackPayload);
      });
      this.hasRegisteredCallback = true;
    }

    const bufferingEnabled = this.settings.setEventBufferingEnabled;
    if (bufferingEnabled) {
      adjustConfig.setEventBufferingEnabled(bufferingEnabled);
    }

    const useDelay = this.settings.setDelay;
    if (useDelay) {
      const delayTime = this.settings.delayTime;
      if (delayTime) {
        adjustConfig.setDelayStart(delayTime);
      }
    }

    Adjust.create(adjustConfig);
  }
  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    track(event, this.settings!);
    return event;
  }

  reset() {
    reset();
  }
}
