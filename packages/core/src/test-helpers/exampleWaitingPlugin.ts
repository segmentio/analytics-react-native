import { PluginType, SegmentEvent, SegmentAPISettings, UpdateType } from '../types';
import { SegmentClient } from '../analytics';
import { DestinationPlugin, WaitingPlugin } from '../plugin';

/**
 * Example WaitingPlugin that automatically resumes after 1 second.
 * Used for testing the waiting plugin mechanism.
 */
export class ExampleWaitingPlugin extends WaitingPlugin {
  public type = PluginType.enrichment;
  public tracked = false;

  configure(analytics: SegmentClient) {
    super.configure(analytics);
    // Simulate async work (network, native module init, etc.)
    setTimeout(() => {
      this.resume();
    }, 1000);
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    super.execute(event);
    this.tracked = true;
    return event;
  }
}

/**
 * Example WaitingPlugin that resumes after 3 seconds when settings are updated.
 * Mimics the Kotlin SDK's ExampleWaitingPlugin behavior.
 */
export class ExampleWaitingPlugin1 extends WaitingPlugin {
  public type = PluginType.before;
  public tracked = false;

  update(_settings: SegmentAPISettings, type: UpdateType) {
    if (type === UpdateType.initial) {
      // Simulate async initialization that takes 3 seconds
      setTimeout(() => {
        this.resume();
      }, 3000);
    }
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    this.tracked = true;
    return event;
  }
}

/**
 * Example WaitingPlugin that requires manual resume() call.
 * Used for testing manual control of event processing.
 */
export class ManualResumeWaitingPlugin extends WaitingPlugin {
  public type = PluginType.enrichment;
  public tracked = false;

  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    this.tracked = true;
    return event;
  }
}

/**
 * Stub destination plugin for testing.
 * Always enabled and accepts all events.
 */
export class StubDestinationPlugin extends DestinationPlugin {
  key = 'StubDestination';
  protected isEnabled(_event: SegmentEvent): boolean {
    return true;
  }
}
