import { PlatformPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';

export class InjectContext extends PlatformPlugin {
  type = PluginType.before;

  execute(event: SegmentEvent) {
    const state = this.analytics!.store.getState();
    const context = state.main.context;
    return {
      ...event,
      context,
    };
  }
}
