import type { Persistor } from 'redux-persist';
import type {
  SegmentAPIIntegrations,
  IntegrationSettings,
  SegmentEvent,
  DeepPartial,
  Context,
} from '..';
import { getStoreWatcher, actions, Store } from '../store';
import type { UserInfoState } from '../store/userInfo';
import type { Storage } from './types';

export class ReduxStorage implements Storage {
  private redux: Store;
  private persistor: Persistor;
  /**
   * Watches changes to redux store
   */
  private watchStore: ReturnType<typeof getStoreWatcher>;
  /**
   * Watches changes to the persistor state
   */
  private watchPersistor: ReturnType<typeof getStoreWatcher>;

  private maxEventsToRetry?: number;

  constructor(
    store: Store,
    persistor: Persistor,
    config?: {
      maxEventsToRetry?: number;
    }
  ) {
    this.redux = store;
    this.persistor = persistor;
    this.watchStore = getStoreWatcher(this.redux);
    this.watchPersistor = getStoreWatcher(this.persistor);
    this.maxEventsToRetry = config?.maxEventsToRetry;
  }

  readonly isReady = {
    get: () => this.persistor.getState().bootstrapped,
    onChange: (callback: (value: boolean) => void) =>
      this.watchPersistor((state) => state.bootstrapped, callback),
  };

  readonly context = {
    get: () => this.redux.getState().main.context,
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.watchStore((state) => state.main.context, callback),
    set: (value: DeepPartial<Context>) => {
      this.redux.dispatch(actions.main.updateContext({ context: value }));
    },
  };

  readonly settings = {
    get: () => this.redux.getState().system.settings,
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.watchStore((state) => state.system.settings, callback),
    set: (value: SegmentAPIIntegrations) => {
      this.redux.dispatch(
        actions.system.updateSettings({ settings: { integrations: value } })
      );
    },
    add: (key: string, value: IntegrationSettings) => {
      this.redux.dispatch(
        actions.system.addDestination({
          destination: { key, settings: value },
        })
      );
    },
  };

  readonly events = {
    get: () => this.redux.getState().main.events,
    onChange: (callback: (value: SegmentEvent[]) => void) =>
      this.watchStore((state) => state.main.events, callback),
    add: (event: SegmentEvent | SegmentEvent[]) => {
      this.redux.dispatch(actions.main.addEvent({ event }));
    },
    remove: (event: SegmentEvent | SegmentEvent[]) => {
      const eventsToRemove = Array.isArray(event) ? event : [event];
      this.redux.dispatch(
        actions.main.deleteEventsByMessageId({
          ids: eventsToRemove
            .filter((e) => e.messageId !== undefined)
            .map((e) => e.messageId!),
        })
      );
    },
  };

  readonly eventsToRetry = {
    get: () => this.redux.getState().main.eventsToRetry,
    onChange: (callback: (value: SegmentEvent[]) => void) =>
      this.watchStore((state) => state.main.eventsToRetry, callback),
    add: (events: SegmentEvent[]) => {
      this.redux.dispatch(
        actions.main.addEventsToRetry({
          events,
          maxEvents: this.maxEventsToRetry,
        })
      );
    },
    remove: (events: SegmentEvent[]) => {
      this.redux.dispatch(
        actions.main.deleteEventsToRetryByMessageId({
          ids: events
            .filter((event) => event.messageId !== undefined)
            .map((event) => event.messageId!),
        })
      );
    },
  };

  readonly userInfo = {
    get: () => this.redux.getState().userInfo,
    onChange: (callback: (value: UserInfoState) => void) =>
      this.watchStore((state) => state.userInfo, callback),
    set: (value: UserInfoState) => {
      const { anonymousId, userId, traits } = this.redux.getState().userInfo;

      if (value.anonymousId !== anonymousId) {
        this.redux.dispatch(
          actions.userInfo.setAnonymousId({ anonymousId: value.anonymousId })
        );
      }

      if (value.userId !== userId) {
        this.redux.dispatch(
          actions.userInfo.setUserId({ userId: value.userId })
        );
      }

      if (value.traits !== traits) {
        this.redux.dispatch(
          actions.userInfo.setTraits({ traits: value.traits })
        );
      }
    },
  };
}
