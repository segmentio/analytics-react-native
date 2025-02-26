import { NativeEventSubscription } from 'react-native';
import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * StatupFlushPolicy triggers a flush right away on client startup
 */
export class BackgroundFlushPolicy extends FlushPolicyBase {
  private appStateSubscription?: NativeEventSubscription;

  start() {
    //no-op
  }

  onEvent(_event: SegmentEvent): void {
    console.log('inside onEvent', _event);
    if ('event' in _event && _event.event === 'Application Backgrounded') {
      console.log({ _event }); // is logged properly on background
      this.shouldFlush.value = true;
    }
  }

  end(): void {
    this.appStateSubscription?.remove();
  }
}
