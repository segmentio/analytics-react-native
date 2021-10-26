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

  update(settings: SegmentAPISettings, type: UpdateType) {
    if (type === UpdateType.initial) {
      return;
    }

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
