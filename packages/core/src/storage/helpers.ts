import type { getStateFunc } from './types';

/**
 * Helper to create a function that can execute both sync and async.
 * Used for supporting Sovran's getState signature. e.g.
 * - Async => enforces consistency by executing inline with the reducers
 * - Sync => returns immediately with the current value, not awaiting for any reducer
 * @param syncFunction code to execute when called synchronously
 * @param asyncFunction code to execute when called async/ concurrency safe
 * @returns a getStateFunc that can support both async and sync modes
 */
export function createGetter<T>(
  syncFunction: () => T,
  asyncFunction: () => Promise<T>
): getStateFunc<T> {
  function getState(): T;
  function getState(safe: true): Promise<T>;
  function getState(safe?: boolean): T | Promise<T> {
    if (safe === true) {
      return asyncFunction();
    }
    return syncFunction();
  }
  return getState;
}
