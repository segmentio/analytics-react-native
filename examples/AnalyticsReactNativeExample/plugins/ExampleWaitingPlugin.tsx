import {
  WaitingPlugin,
  PluginType,
  Plugin,
  
} from '@segment/analytics-react-native';

import type {SegmentAPISettings, SegmentClient, SegmentEvent, UpdateType} from '@segment/analytics-react-native';
export class ExampleWaitingPlugin extends WaitingPlugin {
  type = PluginType.enrichment;
  analytics = undefined;
  tracked = false;

  /**
   * Called when settings are updated
   */
  update(_settings: SegmentAPISettings, _type: UpdateType) {
    if (this.type === PluginType.before) {
      // delay 3 seconds, then resume event processing
      setTimeout(() => {
        this.resume();   
      }, 3000);
    }
  }

  /**
   * Called for track events
   */
  track(event: SegmentEvent) {
    this.tracked = true;
    return event;  
  }
}