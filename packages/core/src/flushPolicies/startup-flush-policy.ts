import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * StatupFlushPolicy triggers a flush right away on client startup
 */
export class StartupFlushPolicy extends FlushPolicyBase {
  constructor() {
    super();
    this.shouldFlush.value = true;
  }

  onEvent(_event: SegmentEvent): void {
    // Nothing to do
  }
}
