import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * StatupFlushPolicy triggers a flush right away on client startup
 */
export class BackgroundFlushPolicy extends FlushPolicyBase {
  start() {
    // Nothing to do
  }

  onEvent(_event: SegmentEvent): void {
    if ('event' in _event && _event.event === 'Application Backgrounded') {
      this.shouldFlush.value = true;
    }
  }

  end(): void {
    // Nothing to do
  }
}
