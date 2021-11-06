import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { actions, getStoreWatcher, initializeStore, Store } from '../store';
import {
  default as mainSlice,
  initialState as mainInitialState,
} from '../store/main';
import {
  default as systemSlice,
  initialState as systemInitialState,
} from '../store/system';
import {
  default as userInfo,
  initialState as userInfoInitialState,
} from '../store/userInfo';
import {
  Context,
  EventType,
  IdentifyEventType,
  ScreenEventType,
  TrackEventType,
} from '../types';

const initialState = {
  main: mainInitialState,
  system: systemInitialState,
  userInfo: userInfoInitialState,
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('redux-persist', () => ({
  persistStore: (store: any) => store,
  persistReducer: (_: any, reducer: any) => reducer,
}));

jest.mock('nanoid/non-secure', () => ({
  nanoid: () => 'iDMkR2-I7c2_LCsPPlvwH',
}));

describe('#initializeStore', () => {
  it('create the store with default state', () => {
    const { store } = initializeStore('test-key');
    expect(store.getState()).toEqual(initialState);
  });

  describe('ACTION: addEvent', () => {
    it('adds the event correctly', () => {
      const { store } = initializeStore('test-key');
      const event = {
        userId: 'user-123',
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: EventType.IdentifyEvent,
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        traits: {
          foo: 'bar',
        },
        messageId: 'iDMkR2-I7c2_LCsPPlvwH',
      } as IdentifyEventType;
      store.dispatch(
        actions.main.addEvent({
          event,
        })
      );
      expect(store.getState().main).toEqual({
        ...initialState.main,
        events: [event],
      });
    });
  });

  describe('ACTION: deleteEventsByMessageId', () => {
    it('deletes the correct event', () => {
      const { store } = initializeStore('test-key');
      const event1 = {
        userId: 'user-123',
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: EventType.IdentifyEvent,
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        traits: {
          foo: 'bar',
        },
        messageId: 'iDMkR2-I7c2_LCsPPlvwH',
      } as IdentifyEventType;

      const event2 = {
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: 'screen',
        name: 'AwesomeScreen',
        properties: {},
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        messageId: 'something-else',
      } as ScreenEventType;

      store.dispatch(
        actions.main.addEvent({
          event: event1,
        })
      );

      store.dispatch(
        actions.main.addEvent({
          event: event2,
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        events: [event1, event2],
      });

      store.dispatch(
        actions.main.deleteEventsByMessageId({
          ids: ['iDMkR2-I7c2_LCsPPlvwH'],
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        events: [event2],
      });
    });
  });

  describe('ACTION: addUserTraits', () => {
    it('adds user traits to the store', () => {
      const { store } = initializeStore('test-key');
      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            firstName: 'Kitty',
          },
        })
      );

      expect(store.getState().userInfo).toEqual({
        ...initialState.userInfo,
        traits: {
          firstName: 'Kitty',
        },
      });
    });

    it('merges new user traits with existing ones', () => {
      const { store } = initializeStore('test-key');
      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            firstName: 'Kitty',
          },
        })
      );

      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            lastName: 'Cat',
          },
        })
      );

      expect(store.getState().userInfo).toEqual({
        ...initialState.userInfo,
        traits: {
          firstName: 'Kitty',
          lastName: 'Cat',
        },
      });
    });

    it('overwrites existing user traits with new ones', () => {
      const { store } = initializeStore('test-key');
      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            firstName: 'Kitty',
          },
        })
      );

      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            firstName: 'Boo',
          },
        })
      );

      expect(store.getState().userInfo).toEqual({
        ...initialState.userInfo,
        traits: {
          firstName: 'Boo',
        },
      });
    });
  });

  describe('ACTION: setUserId', () => {
    it('updates the user id in the state', () => {
      const { store } = initializeStore('test-key');
      store.dispatch(
        actions.userInfo.setUserId({
          userId: '123',
        })
      );

      expect(store.getState().userInfo).toEqual({
        ...initialState.userInfo,
        userId: '123',
      });
    });
  });

  describe('ACTION: reset', () => {
    it('resets all state to initial data state', () => {
      const { store } = initializeStore('test-key');

      const event1 = {
        userId: 'user-123',
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: EventType.IdentifyEvent,
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        traits: {
          foo: 'bar',
        },
        messageId: 'iDMkR2-I7c2_LCsPPlvwH',
      } as IdentifyEventType;

      store.dispatch(
        actions.main.addEvent({
          event: event1,
        })
      );

      store.dispatch(actions.userInfo.setUserId({ userId: 'userId-123' }));

      store.dispatch(
        actions.userInfo.setTraits({
          traits: {
            firstName: 'Kitty',
          },
        })
      );

      expect(store.getState()).not.toEqual(initialState);
      store.dispatch(actions.userInfo.reset());
      expect(store.getState().main).toEqual({
        ...initialState.main,
        events: [event1],
      });
    });
  });

  describe('ACTION: updateContext', () => {
    it('replaces context with new context', () => {
      const { store } = initializeStore('test-key');

      const context = {
        app: {
          version: '1',
        },
      } as Context;

      store.dispatch(
        actions.main.updateContext({
          context,
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        context,
      });
    });
  });

  describe('ACTION: addEventsToRetry', () => {
    it('adds the event correctly', () => {
      const { store } = initializeStore('test-key');
      const event = {
        userId: 'user-123',
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: EventType.IdentifyEvent,
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        traits: {
          foo: 'bar',
        },
        messageId: 'iDMkR2-I7c2_LCsPPlvwH',
      } as IdentifyEventType;
      store.dispatch(
        actions.main.addEventsToRetry({
          events: [event],
          config: {
            writeKey: '123-456',
          },
        })
      );
      expect(store.getState().main).toEqual({
        ...initialState.main,
        eventsToRetry: [event],
      });
    });

    it('removes old events correctly', () => {
      const { store } = initializeStore('test-key');
      const event1 = {
        anonymousId: 'very-anonymous',
        event: 'First Event',
        integrations: {},
        messageId: 'mocked-uuid',
        properties: {
          id: 1,
        },
        timestamp: '2010-01-01T00:00:00.000Z',
        type: EventType.TrackEvent,
        userId: 'current-user-id',
      } as TrackEventType;

      const event2 = {
        ...event1,
        event: 'Second Event',
      } as TrackEventType;

      store.dispatch(
        actions.main.addEventsToRetry({
          events: [event1, event2],
          config: {
            writeKey: '123-456',
            maxEventsToRetry: 3,
          },
        })
      );

      const event3 = {
        ...event1,
        event: 'Third Event',
      } as TrackEventType;

      const event4 = {
        ...event1,
        event: 'Fourth Event',
      } as TrackEventType;

      store.dispatch(
        actions.main.addEventsToRetry({
          events: [event3, event4],
          config: {
            writeKey: '123-456',
            maxEventsToRetry: 3,
          },
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        eventsToRetry: [event2, event3, event4],
      });
    });
  });

  describe('ACTION: deleteEventsToRetryByMessageId', () => {
    it('deletes the correct event', () => {
      const { store } = initializeStore('test-key');
      const event1 = {
        userId: 'user-123',
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: EventType.IdentifyEvent,
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        traits: {
          foo: 'bar',
        },
        messageId: 'iDMkR2-I7c2_LCsPPlvwH',
      } as IdentifyEventType;

      const event2 = {
        anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
        type: 'screen',
        name: 'AwesomeScreen',
        properties: {},
        integrations: {},
        timestamp: '2000-01-01T00:00:00.000Z',
        messageId: 'something-else',
      } as ScreenEventType;

      store.dispatch(
        actions.main.addEventsToRetry({
          events: [event1, event2],
          config: {
            writeKey: '123-456',
          },
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        eventsToRetry: [event1, event2],
      });

      store.dispatch(
        actions.main.deleteEventsToRetryByMessageId({
          ids: ['iDMkR2-I7c2_LCsPPlvwH'],
        })
      );

      expect(store.getState().main).toEqual({
        ...initialState.main,
        eventsToRetry: [event2],
      });
    });
  });

  describe('getStoreWatcher', () => {
    const event = {
      userId: 'user-123',
      anonymousId: 'eWpqvL-EHSHLWoiwagN-T',
      type: EventType.IdentifyEvent,
      integrations: {},
      timestamp: '2000-01-01T00:00:00.000Z',
      traits: {
        foo: 'bar',
      },
      messageId: 'iDMkR2-I7c2_LCsPPlvwH',
    } as IdentifyEventType;

    const rootReducer = combineReducers({
      main: mainSlice.reducer,
      system: systemSlice.reducer,
      userInfo: userInfo.reducer,
    });
    let mockStore = configureStore({ reducer: rootReducer }) as Store;

    beforeEach(() => {
      jest.useFakeTimers();
      // Reset the Redux store to a clean state
      mockStore = configureStore({ reducer: rootReducer }) as Store;
    });

    it('subscribes to changes in the selected objects', () => {
      const subscription = jest.fn();
      const watcher = getStoreWatcher(mockStore);
      watcher((state) => state.main.events, subscription);
      mockStore.dispatch(mainSlice.actions.addEvent({ event }));
      expect(subscription).toHaveBeenCalledTimes(1);
    });

    it('no trigger for changes in non-selected objects', () => {
      const subscription = jest.fn();
      const watcher = getStoreWatcher(mockStore);
      watcher((state) => state.main.eventsToRetry, subscription);
      mockStore.dispatch(mainSlice.actions.addEvent({ event }));
      expect(subscription).toHaveBeenCalledTimes(0);
    });
  });
});
