type Unsubscribe = () => void;

/**
 * Creates a watcher that subscribes to the store and tracks
 * changes to a selector return
 * @param store Store to subscribe to
 * @returns a function to subscribe actions for
 */
export const getStoreWatcher = (store: {
  getState: () => any;
  subscribe: (callback: () => any) => Unsubscribe;
}) => {
  return <T>(
    selector: (state: ReturnType<typeof store.getState>) => T,
    onChange: (value: T) => void
  ) => {
    let currentVal: T = selector(store.getState());
    const unsubscribe = store.subscribe(() => {
      const newVal: T = selector(store.getState());
      if (newVal !== currentVal) {
        currentVal = newVal;
        onChange(newVal);
      }
    });
    return unsubscribe;
  };
};
