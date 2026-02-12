import {WaitingPlugin, PluginType} from '@segment/analytics-react-native';

import type {
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '@segment/analytics-react-native';

/**
 * Example WaitingPlugin that demonstrates how to pause event processing
 * until an async operation completes.
 *
 * Use cases:
 * - Waiting for IDFA/advertising ID permissions
 * - Initializing native SDKs or modules
 * - Loading required configuration from remote sources
 *
 * The plugin automatically pauses event processing when added to the client.
 * Call resume() when your async operation completes to start processing events.
 */
export class ExampleWaitingPlugin extends WaitingPlugin {
  type = PluginType.enrichment;
  tracked = false;

  /**
   * Called when settings are updated from Segment.
   * For initial settings, we simulate an async operation and then resume.
   */
  update(_settings: SegmentAPISettings, type: UpdateType) {
    if (type === UpdateType.initial) {
      // Simulate async work (e.g., requesting permissions, loading data)
      setTimeout(() => {
        // Resume event processing once async work is complete
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
