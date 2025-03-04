import { BackgroundFlushPolicy } from '../background-flush-policy';
import { FlushPolicyBase } from '../types';
import { createTrackEvent } from '../../events';

describe('BackgroundFlushPolicy', () => {
  let policy: BackgroundFlushPolicy;

  beforeEach(() => {
    policy = new BackgroundFlushPolicy();
  });

  test('should be an instance of FlushPolicyBase', () => {
    expect(policy).toBeInstanceOf(FlushPolicyBase);
  });

  test('start() should do nothing', () => {
    expect(policy.start()).toBeUndefined();
  });

  test('end() should do nothing', () => {
    expect(policy.end()).toBeUndefined();
  });

  test('onEvent() should set shouldFlush to true for "Application Backgrounded" event', () => {
    const event = createTrackEvent({
      event: 'Application Backgrounded',
    });
    policy.onEvent(event);
    expect(policy.shouldFlush.value).toBe(true);
  });

  test('onEvent() should not set shouldFlush for other events', () => {
    const event = createTrackEvent({
      event: 'Application Opened',
    });
    policy.onEvent(event);
    expect(policy.shouldFlush.value).toBeFalsy();
  });
});
