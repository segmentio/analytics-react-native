import {
  PluginType,
  SegmentEvent,
  PlatformPlugin,
} from '@segment/analytics-react-native';

/**
 * Plugin that injects the user traits to every event
 */
export class InjectTraits extends PlatformPlugin {
  type = PluginType.before;

  execute(event: SegmentEvent) {
    return {
      ...event,
      context: {
        ...event.context,
        traits: {
          ...event.context,
          ...this.analytics!.userInfo.get().traits,
        },
      },
    };
  }
}
