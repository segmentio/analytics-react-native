import { AppState, AppStateStatus } from 'react-native';
import { BackgroundFlushPolicy } from '../background-flush-policy';

describe('BackgroundFlushPolicy', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Mock timers
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers
  });

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

    AppState.currentState = 'active';
    const policy = new BackgroundFlushPolicy();
    policy.start();
    const observer = jest.fn();

    policy.shouldFlush.onChange(observer);

    expect(addSpy).toHaveBeenCalledTimes(1);
    updateCallback('inactive');
    jest.advanceTimersByTime(2000);

    console.log('Observer calls:', observer.mock.calls);
    expect(observer).toHaveBeenCalledWith(true);
    observer.mockClear();

    updateCallback('background');
    jest.advanceTimersByTime(2000); // Simulate timer triggering
    expect(observer).toHaveBeenCalledWith(true);
    observer.mockClear();

    updateCallback('active');
    jest.advanceTimersByTime(2000);
    expect(observer).not.toHaveBeenCalled();
    observer.mockClear();
  });
});
