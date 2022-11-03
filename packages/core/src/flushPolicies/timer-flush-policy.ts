import type { SegmentEvent } from '../types';
import { type FlushPolicy, Observable } from './types';

/**
 * A Timer based flush policy.
 *
 * Flushes events on an interval.
 */
export class TimerFlushPolicy implements FlushPolicy {
  shouldFlush = new Observable<boolean>(false);

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
    this.interval = interval;
    this.startTimer();
  }

  onEvent(_event: SegmentEvent): void {
    // Reset interval
    this.startTimer();
  }

  reset(): void {
    this.shouldFlush.value = false;
    this.startTimer();
  }
}
