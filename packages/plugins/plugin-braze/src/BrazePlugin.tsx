import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import track from './methods/track';
import flush from './methods/flush';

export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Braze';

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  flush() {
    flush();
  }
}
