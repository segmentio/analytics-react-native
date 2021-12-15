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
    const currentUserInfo = this.analytics?.userInfo.get();

    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      currentUserInfo?.userId === event.userId &&
      currentUserInfo?.anonymousId === event.anonymousId &&
      currentUserInfo?.traits === event.traits
    ) {
      let integrations = event.integrations;

      if (integrations !== undefined) {
        integrations[this.key] = false;
      }
    } else {
      identify(event);
    }
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
