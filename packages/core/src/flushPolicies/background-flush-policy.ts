import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import type { SegmentEvent } from '../types';
import { FlushPolicyBase } from './types';

/**
 * StatupFlushPolicy triggers a flush right away on client startup
 */
export class BackgroundFlushPolicy extends FlushPolicyBase {
  private appStateSubscription?: NativeEventSubscription;
  private appState: AppStateStatus = AppState.currentState;

  start() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (
          ['active', 'inactive'].includes(this.appState) &&
          ['inactive', 'background'].includes(nextAppState)
        ) {
          console.log('inside if condition');
          setTimeout(() => {
            this.shouldFlush.value = true;
          }, 2000);
        }
        this.appState = nextAppState;
      }
    );
  }

  onEvent(_event: SegmentEvent): void {
    //if ('event' in _event && _event.event === 'Application Backgrounded') {
    // setTimeout(() => {
    //   this.shouldFlush.value = true;
    // }, 2000);
    // }
  }

  end(): void {
    this.appStateSubscription?.remove();
  }
}
