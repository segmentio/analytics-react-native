import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  TrackEventType,
  SegmentAPISettings,
  UpdateType,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import screen from './methods/screen';
import track from './methods/track';
import reset from './methods/reset';
import type { SegmentFirebaseSettings } from './types';
export class FirebasePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Firebase';

  update(settings: SegmentAPISettings, _: UpdateType) {
    const firebaseSettings = settings.integrations[
      this.key
    ] as SegmentFirebaseSettings;

    if (firebaseSettings === undefined) {
      return;
    }
  }

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  screen(event: ScreenEventType) {
    screen(event);
    return event;
  }

  reset() {
    reset();
  }
}
