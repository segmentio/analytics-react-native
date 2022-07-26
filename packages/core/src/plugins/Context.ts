import { PlatformPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';

export class InjectContext extends PlatformPlugin {
  type = PluginType.before;

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    // We need to get the Context in a concurrency safe mode to permit changes to make it in before we retrieve it
    const context = await this.analytics!.context.get(true);
    return {
      ...event,
      context: {
        ...event.context,
        ...context,
      },
    };
  }
}
