import type { Action, Store } from './store';

type ActionCreator<P, S> = (payload: P) => Action<S>;

interface BridgeStore<T> {
  store: Store<T>;
  actions: { [key: string]: ActionCreator<any, T> };
}

interface StoreAction<P, S> {
  key: string;
  store: Store<S>;
  actionCreator: ActionCreator<P, S>;
}

const actionMap: { [key: string]: StoreAction<any, any>[] } = {};

export const registerBridgeStore = <T = any>(
  ...stores: BridgeStore<T>[]
): void => {
  for (const store of stores) {
    for (const [key, actionCreator] of Object.entries(store.actions)) {
      if (!actionMap[key]) {
        actionMap[key] = [];
      }
      actionMap[key].push({
        key,
        store: store.store,
        actionCreator,
      });
    }
  }
};

export const onStoreAction = async <T>(
  event: string,
  payload: T
): Promise<void> => {
  if (actionMap[event] !== undefined && actionMap[event].length > 0) {
    const actions = actionMap[event];
    for (const action of actions) {
      await action.store.dispatch(action.actionCreator(payload));
    }
  }
};
