import type { Persistor } from '..';
import { createStore, Store, StoreConfig } from '../store';

interface Event {
  id: string;
  description: string;
}

type EventStore = { events: Event[] };

describe('Sovran', () => {
  it('should work', async () => {
    // Create a new store
    const sovran = createStore<EventStore>({ events: [] });

    // Setup a subscription callback
    const subscription = jest.fn();
    sovran.subscribe(subscription);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    // Dispatch an action to add a new event in our store
    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    // Subscription gets called
    expect(subscription).toHaveBeenCalledWith(expectedState);

    // And we can also access state from here
    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should work with multiple stores', async () => {
    const sovran = createStore<EventStore>({ events: [] });
    const sovran2 = createStore<EventStore>({ events: [] });
    const subscription = jest.fn();
    const subscription2 = jest.fn();
    sovran.subscribe(subscription);
    sovran2.subscribe(subscription2);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    expect(subscription).toHaveBeenCalledWith(expectedState);
    expect(subscription2).not.toHaveBeenCalled();

    expect(sovran.getState()).toEqual(expectedState);
    expect(sovran2.getState()).toEqual({ events: [] });
  });

  it('should work with multiple subscribers', async () => {
    const sovran = createStore<EventStore>({ events: [] });
    const subscription = jest.fn();
    const subscription2 = jest.fn();
    sovran.subscribe(subscription);
    sovran.subscribe(subscription2);

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    expect(subscription).toHaveBeenCalledWith(expectedState);
    expect(subscription2).toHaveBeenCalledWith(expectedState);

    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should work with multiple events sent', async () => {
    const sovran = createStore<EventStore>({ events: [] });
    const n = 100;

    for (let i = 0; i < n; i++) {
      const sampleEvent: Event = {
        id: i.toString(),
        description: `test ${i}`,
      };
      await sovran.dispatch((state) => {
        return {
          events: [...state.events, sampleEvent],
        };
      });
    }

    expect(sovran.getState().events.length).toEqual(n);
  });

  it('should handle unsubscribe', async () => {
    // Create a new store
    const sovran = createStore<EventStore>({ events: [] });

    // Setup a subscription callback
    const subscription = jest.fn();
    const unsubscribe = sovran.subscribe(subscription);

    // Now unsubscribe
    unsubscribe();

    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };

    const expectedState = {
      events: [sampleEvent],
    };

    // Dispatch an action to add a new event in our store
    await sovran.dispatch((state) => {
      return {
        events: [...state.events, sampleEvent],
      };
    });

    // Subscription gets called
    expect(subscription).not.toHaveBeenCalled();

    // And we can also access state from here
    expect(sovran.getState()).toEqual(expectedState);
  });

  it("should not call subscribers if the state didn't change", async () => {
    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };
    // Create a new store
    const sovran = createStore<EventStore>({ events: [sampleEvent] });

    // Setup a subscription callback
    const subscription = jest.fn();
    sovran.subscribe(subscription);

    const expectedState = {
      events: [sampleEvent],
    };

    // Dispatch an action that doesn't change the state
    await sovran.dispatch((state) => {
      return state;
    });

    // Subscription gets called
    expect(subscription).not.toHaveBeenCalled();

    // And we can also access state from here
    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should handle gracefully errors in actions', async () => {
    const sampleEvent: Event = {
      id: '1',
      description: 'test',
    };
    // Create a new store
    const sovran = createStore<EventStore>({ events: [sampleEvent] });

    // Setup a subscription callback
    const subscription = jest.fn();
    sovran.subscribe(subscription);

    const expectedState = {
      events: [sampleEvent],
    };

    // Dispatch an action that doesn't change the state
    await sovran.dispatch(() => {
      throw new Error('Whoops!');
    });

    // Subscription gets called
    expect(subscription).not.toHaveBeenCalled();

    // And we can also access state from here
    expect(sovran.getState()).toEqual(expectedState);
  });

  it('should support listeners calling unsubscribe from their handling code', async () => {
    // Create a new store
    const sovran = createStore<EventStore>({ events: [] });

    // Setup a couple of subscriptions
    const onlyOnceSubscription = jest.fn();
    const unsubscribe = sovran.subscribe(
      onlyOnceSubscription.mockImplementation(() => {
        unsubscribe();
      })
    );
    const anotherSubscription = jest.fn();
    sovran.subscribe(anotherSubscription);

    // Dispatch an action to add a new event in our store
    await sovran.dispatch((state) => {
      return {
        events: [
          ...state.events,
          {
            id: '1',
            description: 'test',
          },
        ],
      };
    });

    // Now send another event
    await sovran.dispatch((state) => {
      return {
        events: [
          ...state.events,
          {
            id: '2',
            description: 'test',
          },
        ],
      };
    });

    // The once subscription should have been called only once, the other one every update
    expect(onlyOnceSubscription).toHaveBeenCalledTimes(1);
    expect(anotherSubscription).toHaveBeenCalledTimes(2);
  });

  /**
   * Tests the persistence calls of the Store to comply to the interface
   */
  describe('Persistence', () => {
    const getMockPersistor = <T>(initialState: T): Persistor => {
      return {
        get: jest.fn().mockResolvedValue(initialState),
        set: jest.fn(),
      };
    };

    const getAwaitableSovranConstructor = async <T extends object>(
      initialState: T,
      config: StoreConfig
    ): Promise<Store<T>> => {
      // This weird looking thing is to block the jest runner to wait until the persistor is initialized using the usual async/await instead of weird callbacks
      return await new Promise((resolve) => {
        const sovran: Store<T> = createStore<T>(initialState, {
          ...config,
          persist: {
            storeId: 'test',
            ...config.persist,
            onInitialized: () => resolve(sovran),
          },
        });
      });
    };

    beforeEach(() => {
      // Using legacy fake timers cause the modern type have a conflict with async/await that we use everywhere here
      jest.useFakeTimers('legacy');
    });

    it('calls the persistor on init and after the delay', async () => {
      const ID = 'persistorTest';
      const INTERVAL = 5000;

      const persistedEvent: Event = {
        id: '0',
        description: 'myPersistedEvent',
      };

      const persistedState = { events: [persistedEvent] };

      const mockPesistor: Persistor = getMockPersistor(persistedState);

      const sovran = await getAwaitableSovranConstructor<EventStore>(
        { events: [] },
        {
          persist: {
            storeId: ID,
            saveDelay: INTERVAL,
            persistor: mockPesistor,
          },
        }
      );

      // The persistor should have been called and the state should be updated
      expect(sovran.getState()).toEqual(persistedState);
      expect(mockPesistor.get).toHaveBeenCalledTimes(1);

      // Now add a new event, then see if the state is persisted after a timeout

      const sampleEvent: Event = {
        id: '1',
        description: 'test',
      };

      const expectedState = {
        events: [persistedEvent, sampleEvent],
      };

      // Dispatch an action to add a new event in our store
      await sovran.dispatch((state) => {
        return {
          events: [...state.events, sampleEvent],
        };
      });

      // And we can also access state from here
      expect(sovran.getState()).toEqual(expectedState);

      jest.advanceTimersByTime(INTERVAL);

      expect(mockPesistor.set).toHaveBeenCalledWith(ID, expectedState);
    });

    it('saves initial state if storage is empty on startup', async () => {
      const ID = 'persistorTest';
      const INTERVAL = 5000;

      // Nothing is in the persisted state
      const persistedState = undefined;
      // But we have a default initial state for sovran
      const sampleEvent: Event = {
        id: '1',
        description: 'test',
      };
      const initialState = { events: [sampleEvent] };

      const mockPesistor: Persistor = getMockPersistor(persistedState);

      const sovran = await getAwaitableSovranConstructor<EventStore>(
        initialState,
        {
          persist: {
            storeId: ID,
            saveDelay: INTERVAL,
            persistor: mockPesistor,
          },
        }
      );

      // The initial state should have been persisted, state should match initial
      expect(sovran.getState()).toEqual(initialState);
      expect(mockPesistor.get).toHaveBeenCalledTimes(1);
      expect(mockPesistor.set).toHaveBeenCalledWith(ID, initialState);
    });
  });

  describe('Concurrency', () => {
    it('handles concurrent writes and reads with the safe option', async () => {
      const sovran = createStore<EventStore>({ events: [] });

      const p1 = sovran.dispatch(() => {
        return {
          events: [
            {
              id: '1',
              description: 'test',
            },
          ],
        };
      });

      const p2 = sovran.getState(true);

      await Promise.all([p1, p2]).then(([s1, s2]) => {
        expect(s1).toEqual(s2);
      });
    });
  });
});
