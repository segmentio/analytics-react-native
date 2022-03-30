import {
  DestinationPlugin,
  GroupEventType,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  TrackEventType,
} from '@segment/analytics-react-native';
import group from './methods/group';
import identify from './methods/identify';
import reset from './methods/reset';
import screen from './methods/screen';
import track from './methods/track';

export class TaplyticsPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Taplytics';

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  screen(event: ScreenEventType) {
    screen(event);
    return event;
  }

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  group(event: GroupEventType) {
    group(event);
    return event;
  }

  reset() {
    reset();
  }
}
