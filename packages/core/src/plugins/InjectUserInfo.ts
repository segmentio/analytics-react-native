import { PlatformPlugin } from '../plugin';
import {
  AliasEventType,
  EventType,
  IdentifyEventType,
  PluginType,
  SegmentEvent,
} from '../types';

/**
 * This plugin injects the userInfo data into the event and also stores the changes applied by identify and alias calls into the state
 */
export class InjectUserInfo extends PlatformPlugin {
  type = PluginType.before;

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    // Order here is IMPORTANT!
    // Identify and Alias userInfo set operations have to come as soon as possible
    // Do not block the set by doing a safe get first as it might cause a race condition
    // within events procesing in the timeline asyncronously
    if (event.type === EventType.IdentifyEvent) {
      const userInfo = await this.analytics!.userInfo.set((state) => ({
        ...state,
        userId: event.userId ?? state.userId,
        traits: {
          ...state.traits,
          ...event.traits,
        },
      }));

      return {
        ...event,
        anonymousId: userInfo.anonymousId,
        userId: event.userId ?? userInfo.userId,
        traits: {
          ...userInfo.traits,
          ...event.traits,
        },
      } as IdentifyEventType;
    } else if (event.type === EventType.AliasEvent) {
      let previousUserId: string;

      const userInfo = await this.analytics!.userInfo.set((state) => {
        previousUserId = state.userId ?? state.anonymousId;

        return {
          ...state,
          userId: event.userId,
        };
      });

      return {
        ...event,
        anonymousId: userInfo.anonymousId,
        userId: event.userId,
        previousId: previousUserId!,
      } as AliasEventType;
    }

    const userInfo = await this.analytics!.userInfo.get(true);
    const injectedEvent: SegmentEvent = {
      ...event,
      anonymousId: userInfo.anonymousId,
      userId: userInfo.userId,
    };

    return injectedEvent;
  }
}
