import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  TrackEventType,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import screen from './methods/screen';
import track from './methods/track';
import reset from './methods/reset';

export class FirebasePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Firebase';

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
