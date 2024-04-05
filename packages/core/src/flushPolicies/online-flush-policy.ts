import NetInfo from '@react-native-community/netinfo';
import { FlushPolicyBase } from './types';

/**
 * OnlineFlushPolicy uploads events when the device (re-)connects to network
 */
export class OnlineFlushPolicy extends FlushPolicyBase {
  private unsubscribe: (() => void) | undefined;

  start(): void {
    this.unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === true) {
        this.shouldFlush.value = true;
      }
    });
  }

  end(): void {
    this.unsubscribe?.();
  }

  onEvent(): void {
    // not applicable
  }
}
