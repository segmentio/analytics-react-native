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
  lastSeenTraits: UserInfoState | null = null;
  userIdentified: boolean = false;

  identify(event: IdentifyEventType) {
    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      this.lastSeenTraits?.userId === event.userId &&
      this.lastSeenTraits?.anonymousId === event.anonymousId &&
      this.lastSeenTraits?.traits === event.traits
    ) {
      let integrations = event.integrations;

      if (integrations !== undefined) {
        integrations[this.key] = false;
      }
    } else {
      identify(event);
      this.userIdentified = true;
    }

    if (this.userIdentified === true) {
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
