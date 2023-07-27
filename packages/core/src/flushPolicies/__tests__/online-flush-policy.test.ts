import type {
  NetInfoChangeHandler,
  NetInfoState,
} from '@react-native-community/netinfo';
import { OnlineFlushPolicy } from '../online-flush-policy';

let netInfoListener: NetInfoChangeHandler;
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (cb: NetInfoChangeHandler) => {
    netInfoListener = cb;
  },
}));

describe('OnlineFlushPolicy', () => {
  it('triggers a flush when device (re-)connects to network', () => {
    const policy = new OnlineFlushPolicy();

    policy.start();

    const observer = jest.fn();

    policy.shouldFlush.onChange(observer);

    policy.onEvent();
    policy.onEvent();
    policy.onEvent();

    expect(observer).not.toHaveBeenCalled();

    // lets signal that the device is now connected
    netInfoListener({ isConnected: true } as NetInfoState);

    expect(observer).toHaveBeenCalledWith(true);
  });
});
