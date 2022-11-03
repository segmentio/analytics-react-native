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

  onEvent(_event: SegmentEvent): void {
    this.count += 1;
    if (this.count >= this.flushAt) {
      this.shouldFlush.value = true;
    }
  }

  reset(): void {
    super.reset();
    this.count = 0;
  }
}
