import { SegmentClient } from 'src';
import { Plugin } from 'src/plugin';
import { PluginType, SegmentEvent } from 'src/types';

/**
 * WaitingPlugin
 * Buffers events when paused and releases them when resumed.
 */
export class WaitingPlugin extends Plugin {
  public type = PluginType.before;
  private paused = true;
  private buffer: SegmentEvent[] = [];

  configure(analytics: SegmentClient) {
    super.configure(analytics);
  }

  isPaused() {
    return this.paused;
  }

  pause() {
    this.paused = true;
  }

  async resume() {
    if (!this.paused) {
      return;
    }

    this.paused = false;

    const events = [...this.buffer];
    this.buffer = [];

    for (const event of events) {
      try {
        if (this.analytics !== undefined) {
          await this.analytics.process(event);
        }
      } catch (err) {
        // Ignore individual errors
      }
    }
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    if (this.paused) {
      this.buffer.push(event);
      return undefined;
    }
    return event;
  }
}
