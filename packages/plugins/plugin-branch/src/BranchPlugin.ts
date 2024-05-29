import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  IdentifyEventType,
  AliasEventType,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import screen from './methods/screen';
import alias from './methods/alias';
import track from './methods/track';
import reset from './methods/reset';

export class BranchPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Branch Metrics';

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  async track(event: TrackEventType) {
    await track(event);
    return event;
  }

  async screen(event: ScreenEventType) {
    await screen(event);
    return event;
  }

  alias(event: AliasEventType) {
    alias(event);
    return event;
  }

  reset() {
    reset();
  }
}
