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
          (this.appState === 'active' || 'unknown') &&
          ['inactive', 'background'].includes(nextAppState)
        ) {
          // When the app goes into the background we will trigger a flush
          this.shouldFlush.value = true;
        }
      }
    );
  }

  onEvent(_event: SegmentEvent): void {
    // Nothing to do
  }

  end(): void {
    this.appStateSubscription?.remove();
  }
}
