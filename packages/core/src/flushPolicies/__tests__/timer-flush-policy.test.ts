import { TimerFlushPolicy } from '../timer-flush-policy';

describe('TimerFlushPolicy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('triggers a flush when timer is done', () => {
    const time = 100;
    const policy = new TimerFlushPolicy(time);
    policy.start();

    const observer = jest.fn();

    policy.shouldFlush.onChange(observer);

    jest.advanceTimersByTime(time);
    expect(observer).toHaveBeenCalledWith(true);

    // Won't trigger again until it is handled and reset
    jest.advanceTimersByTime(time);
    expect(observer).toHaveBeenCalledTimes(1);

    policy.reset();
    expect(observer).toHaveBeenCalledWith(false);
    jest.advanceTimersByTime(time);
    // + 1 for reset, + 1 for timer
    expect(observer).toHaveBeenCalledTimes(3);
  });
});
