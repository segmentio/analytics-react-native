import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  IdentifyEventType,
  AliasEventType,

  // @ts-ignore
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import screen from './methods/screen';
import alias from './methods/alias';
import track from './methods/track';
import reset from './methods/reset';

export class BranchPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Branch';

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

  alias(event: AliasEventType) {
    alias(event);
    return event;
  }

  reset(): void {
    reset();
  }
}
