import { AppState, AppStateStatus } from 'react-native';
import { BackgroundFlushPolicy } from '../background-flush-policy';

describe('BackgroundFlushPolicy', () => {
  it('triggers a flush when reaching limit', () => {
    let updateCallback = (_val: AppStateStatus) => {
      return;
    };

    const addSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_action, callback) => {
        updateCallback = callback;
        return { remove: jest.fn() };
      });

    const policy = new BackgroundFlushPolicy();
    policy.start();
    const observer = jest.fn();

    policy.shouldFlush.onChange(observer);

    expect(addSpy).toHaveBeenCalledTimes(1);

    updateCallback('background');
    expect(observer).toHaveBeenCalledWith(true);
    observer.mockClear();

    updateCallback('active');
    expect(observer).not.toHaveBeenCalled();

    updateCallback('inactive');
    expect(observer).toHaveBeenCalledWith(true);
  });
});
