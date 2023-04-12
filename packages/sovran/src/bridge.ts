import type { Action, Store } from './store';

type ActionCreator<P, S> = (payload: P) => Action<S>;

interface BridgeStore<T extends object> {
  store: Store<T>;
  actions: { [key: string]: ActionCreator<unknown, T> };
}

interface StoreAction<P, S extends object> {
  key: string;
  store: Store<S>;
  actionCreator: ActionCreator<P, S>;
}

const actionMap: { [key: string]: StoreAction<unknown, object>[] } = {};

export const registerBridgeStore = <T extends object>(
  ...stores: BridgeStore<T>[]
): void => {
  for (const store of stores) {
    for (const [key, actionCreator] of Object.entries(store.actions)) {
      if (actionMap[key] === undefined) {
        actionMap[key] = [];
      }
      actionMap[key].push({
        key,
        store: store.store as unknown as Store<object>,
        actionCreator: actionCreator as unknown as ActionCreator<
          unknown,
          object
        >,
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
