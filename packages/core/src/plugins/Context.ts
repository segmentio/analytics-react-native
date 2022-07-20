import { PlatformPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';

export class InjectContext extends PlatformPlugin {
  type = PluginType.before;

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    console.warn('Inject Context!');
    // We need to get the Context in a concurrency safe mode to permit changes (e.g. identify) to make it in before we retrieve it
    const context = await this.analytics!.context.get(true);

    console.log('-> context: ', context);

    return {
      ...event,
      context: {
        ...event.context,
        ...context,
      },
    };
  }
}
