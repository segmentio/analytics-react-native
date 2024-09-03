import type { Unsubscribe } from '../state';
import type { SegmentEvent } from '../types';
import type { FlushPolicy } from './types';

export class FlushPolicyExecuter {
  readonly policies: FlushPolicy[];
  private observers: Unsubscribe[] = [];
  private onFlush: () => void;

  constructor(policies: FlushPolicy[], onFlush: () => void) {
    this.policies = [...policies];
    this.onFlush = onFlush;

    // Now listen to changes on the flush policies shouldFlush
    for (const policy of this.policies) {
      this.startPolicy(policy);
    }
  }

  add(policy: FlushPolicy) {
    this.startPolicy(policy);
    this.policies.push(policy);
  }

  remove(policy: FlushPolicy) {
    policy.end();
    const i = this.policies.findIndex((p) => p === policy);
    return this.removeIndex(i);
  }

  removeIndex(index: number): boolean {
    if (index < 0) {
      return false;
    }

    const policy = this.policies[index];

    if (policy !== undefined) {
      policy.reset();
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Checks if any flush policy is requesting a flush
   * This is only intended for startup/initialization, all policy shouldFlush
   * changes are already observed and reacted to.
   *
   * This is for policies that might startup with a shouldFlush = true value
   */
  manualFlush() {
    for (const policy of this.policies) {
      if (policy.shouldFlush.value) {
        this.onFlush();
        break;
      }
    }
  }

  /**
   * Notifies each flush policy that an event is being processed
   */
  notify(event: SegmentEvent) {
    for (const policy of this.policies) {
      policy.onEvent(event);
    }
  }

  /**
   * Resets all flush policies
   */
  reset() {
    for (const policy of this.policies) {
      policy.reset();
    }
  }

  cleanup() {
    if (this.observers.length > 0) {
      for (const unsubscribe of this.observers) {
        unsubscribe();
      }
    }
    for (const policy of this.policies) {
      policy.end();
    }
  }

  private startPolicy(policy: FlushPolicy) {
    const unsubscribe = policy.shouldFlush.onChange((shouldFlush) => {
      if (shouldFlush) {
        this.onFlush();
      }
    });
    this.observers.push(unsubscribe);
    policy.start();
  }
}
