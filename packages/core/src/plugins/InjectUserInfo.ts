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
    const userInfo = await this.analytics!.userInfo.get(true);
    const injectedEvent: SegmentEvent = {
      ...event,
      anonymousId: userInfo.anonymousId,
      userId: userInfo.userId,
    };

    if (event.type === EventType.IdentifyEvent) {
      await this.analytics!.userInfo.set((state) => ({
        ...state,
        userId: event.userId ?? state.userId,
        traits: {
          ...state.traits,
          ...event.traits,
        },
      }));

      return {
        ...injectedEvent,
        userId: event.userId ?? userInfo.userId,
        traits: {
          ...userInfo.traits,
          ...event.traits,
        },
      } as IdentifyEventType;
    } else if (event.type === EventType.AliasEvent) {
      const { anonymousId, userId: previousUserId } = userInfo;

      await this.analytics!.userInfo.set((state) => ({
        ...state,
        userId: event.userId,
      }));

      return {
        ...injectedEvent,
        previousId: previousUserId || anonymousId,
      } as AliasEventType;
    }
    return injectedEvent;
  }
}
