import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  UserInfoState,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import track from './methods/track';
import flush from './methods/flush';

export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined;

  identify(event: IdentifyEventType) {
    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      this.lastSeenTraits?.userId === event.userId &&
      this.lastSeenTraits?.anonymousId === event.anonymousId &&
      this.lastSeenTraits?.traits === event.traits
    ) {
      return;
    } else {
      identify(event);
      this.lastSeenTraits = {
        anonymousId: event.anonymousId ?? '',
        userId: event.userId,
        traits: event.traits,
      };
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
