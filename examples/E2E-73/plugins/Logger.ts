import {
  Plugin,
  PluginType,
  SegmentEvent,
} from '@segment/analytics-react-native';

export class Logger extends Plugin {
  type = PluginType.before;

  execute(event: SegmentEvent) {
    console.log('[Logger Plugin]', event);
    return event;
  }
}
