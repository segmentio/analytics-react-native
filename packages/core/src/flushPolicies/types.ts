import type { SegmentEvent } from '../types';

type Observer<T> = (value: T) => void;

/**
 * A simple observable value or object
 */
export class Observable<T> {
  private internalValue: T;
  private observers: Observer<T>[];

  constructor(value: T) {
    this.internalValue = value;
    this.observers = [];
  }

  public get value(): T {
    return this.internalValue;
  }

  public set value(v: T) {
    this.internalValue = v;
    for (const observer of this.observers) {
      observer(this.internalValue);
    }
  }

  public onChange(observer: Observer<T>): () => void {
    const n = this.observers.push(observer);
    return () => {
      this.observers.splice(n - 1, 1);
    };
  }
}

/**
 * FlushPolicy defines the strategy for executing flushes
 * (uploading events to destinations)
 */
export interface FlushPolicy {
  /**
   * Marks when the client should atempt to upload events
   */
  shouldFlush: Observable<boolean>;

  /**
   * Start gets executed when the FlushPolicy is added to the client.
   *
   * This is a good place to initialize configuration or timers as it will only
   * execute when this policy is enabled
   */
  start(): void;

  /**
   * Executed every time an event is tracked by the client
   * @param event triggered event
   */
  onEvent(event: SegmentEvent): void;

  /**
   * Resets the values of this policy.
   *
   * Called when the flush has been completed.
   */
  reset(): void;
}

/**
 * A Base Class for implementing a FlushPolicy.
 *
 * Initializes the shouldFlush value to false and sets it to false on reset
 */
export abstract class FlushPolicyBase implements FlushPolicy {
  shouldFlush = new Observable<boolean>(false);

  reset(): void {
    this.shouldFlush.value = false;
  }

  abstract start(): void;

  abstract onEvent(event: SegmentEvent): void;
}
