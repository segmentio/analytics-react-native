import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * CountFlushPolicy uploads events when the count of events reaches a set limit
 */
export class CountFlushPolicy extends FlushPolicyBase {
  private count = 0;
  private flushAt: number;

  constructor(limit: number) {
    super();
    this.flushAt = limit;
  }

  start(): void {
    this.count = 0;
  }

  onEvent(_event: SegmentEvent): void {
    this.count += 1;
    console.log(`[CountFlushPolicy] Event count: ${this.count}/${this.flushAt}`);
    if (this.count >= this.flushAt) {
      console.log('[CountFlushPolicy] Triggering flush!');
      this.shouldFlush.value = true;
    }
  }

  reset(): void {
    super.reset();
    this.count = 0;
  }
}
