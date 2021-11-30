import { PlatformPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';

export class InjectContext extends PlatformPlugin {
  type = PluginType.before;

  execute(event: SegmentEvent) {
    return {
      ...event,
      context: {
        ...event.context,
        ...this.analytics!.context.get(),
      },
    };
  }
}
