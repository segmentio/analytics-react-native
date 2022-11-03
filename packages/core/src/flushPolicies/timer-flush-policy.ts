import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * A Timer based flush policy.
 *
 * Flushes events on an interval.
 */
export class TimerFlushPolicy extends FlushPolicyBase {
  private flushTimeout!: ReturnType<typeof setTimeout>;
  private interval: number;

  private startTimer() {
    clearTimeout(this.flushTimeout);
    this.flushTimeout = setTimeout(() => {
      this.shouldFlush.value = true;
    }, this.interval);
  }

  /**
   * @param interval interval to flush in milliseconds
   */
  constructor(interval: number) {
    super();
    this.interval = interval;
  }

  start(): void {
    this.startTimer();
  }

  onEvent(_event: SegmentEvent): void {
    // Reset interval
    this.startTimer();
  }

  reset(): void {
    super.reset();
    this.startTimer();
  }
}
