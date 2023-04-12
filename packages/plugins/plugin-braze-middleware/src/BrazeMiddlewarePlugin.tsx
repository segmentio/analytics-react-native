import {
  Plugin,
  PluginType,
  UserInfoState,
  SegmentEvent,
} from '@segment/analytics-react-native';

export class BrazeMiddlewarePlugin extends Plugin {
  type = PluginType.before;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined = undefined;

  execute(event: SegmentEvent): SegmentEvent | undefined {
    //check to see if anything has changed
    //if it hasn't changed disable integration
    if (event.type === 'identify') {
      if (
        this.lastSeenTraits?.userId === event.userId &&
        this.lastSeenTraits?.anonymousId === event.anonymousId &&
        this.lastSeenTraits?.traits === event.traits
      ) {
        const integrations = event.integrations;

        if (integrations !== undefined) {
          integrations[this.key] = false;
        }
      } else {
        this.lastSeenTraits = {
          anonymousId: event.anonymousId ?? '',
          userId: event.userId,
          traits: event.traits,
        };
      }
    }
    return event;
  }
}
