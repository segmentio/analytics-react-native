import { CountFlushPolicy } from '../count-flush-policy';
import { FlushPolicyExecuter } from '../flush-policy-executer';
import { TimerFlushPolicy } from '../timer-flush-policy';
import type { SegmentEvent } from '../../types';

describe('FlushPolicyExecuter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('executes flush per policy', () => {
    const policies = [new CountFlushPolicy(2), new TimerFlushPolicy(100)];
    const flush = jest.fn();

    const executer = new FlushPolicyExecuter(policies, flush);

    executer.notify({} as SegmentEvent);
    executer.notify({} as SegmentEvent);

    // CountFlushPolicy should flush as there's 2 events now
    expect(flush).toHaveBeenCalledTimes(1);

    // When the timer is up the TimerFlushPolicy should also execute
    jest.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('resets al policies', () => {
    const countPolicy = new CountFlushPolicy(2);
    const timerPolicy = new TimerFlushPolicy(100);
    const policies = [countPolicy, timerPolicy];
    const flush = jest.fn();

    const executer = new FlushPolicyExecuter(policies, flush);

    executer.notify({} as SegmentEvent);
    executer.notify({} as SegmentEvent);
    expect(countPolicy.shouldFlush.value).toBe(true);

    executer.reset();
    expect(countPolicy.shouldFlush.value).toBe(false);
  });

  it('can remove policies', () => {
    const countPolicy = new CountFlushPolicy(2);
    const timerPolicy = new TimerFlushPolicy(100);
    const policies = [countPolicy, timerPolicy];
    const flush = jest.fn();

    const executer = new FlushPolicyExecuter(policies, flush);

    executer.notify({} as SegmentEvent);

    executer.remove(countPolicy);

    executer.notify({} as SegmentEvent);

    // No CountPolicy so it shouldn't trigger
    expect(flush).not.toHaveBeenCalled();

    // But timer will still flush
    jest.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('can add policies', () => {
    const countPolicy = new CountFlushPolicy(2);
    const policies = [countPolicy];
    const flush = jest.fn();

    const executer = new FlushPolicyExecuter(policies, flush);

    executer.notify({} as SegmentEvent);
    executer.notify({} as SegmentEvent);

    expect(flush).toHaveBeenCalledTimes(1);

    const timerPolicy = new TimerFlushPolicy(100);
    executer.add(timerPolicy);

    // But timer will still flush
    jest.advanceTimersByTime(100);
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
