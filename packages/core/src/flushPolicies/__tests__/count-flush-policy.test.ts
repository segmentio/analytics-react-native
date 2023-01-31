import type { SegmentEvent } from '../../types';
import { CountFlushPolicy } from '../count-flush-policy';

describe('CountFlushPolicy', () => {
  it('triggers a flush when reaching limit', () => {
    const policy = new CountFlushPolicy(3);

    const observer = jest.fn();

    policy.shouldFlush.onChange(observer);

    policy.onEvent({} as SegmentEvent);
    policy.onEvent({} as SegmentEvent);
    policy.onEvent({} as SegmentEvent);

    expect(observer).toHaveBeenCalledWith(true);

    // Keeps triggering until handled / reset
    policy.onEvent({} as SegmentEvent);
    expect(observer).toHaveBeenCalledTimes(2);

    policy.reset();
    policy.onEvent({} as SegmentEvent);
    policy.onEvent({} as SegmentEvent);
    policy.onEvent({} as SegmentEvent);
    expect(observer).toHaveBeenCalledTimes(4);
  });
});
