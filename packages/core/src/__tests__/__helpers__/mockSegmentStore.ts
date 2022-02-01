import type { Storage } from '../../storage';
import type {
  Context,
  DeepPartial,
  IntegrationSettings,
  SegmentAPIIntegrations,
  SegmentEvent,
  UserInfoState,
} from '../../types';

type Data = {
  isReady: boolean;
  events: SegmentEvent[];
  context?: DeepPartial<Context>;
  settings: SegmentAPIIntegrations;
  userInfo: UserInfoState;
};

const INITIAL_VALUES: Data = {
  isReady: true,
  events: [],
  context: undefined,
  settings: {},
  userInfo: {
    anonymousId: 'anonymousId',
    userId: undefined,
    traits: undefined,
  },
};

export class MockSegmentStore implements Storage {
  private data: Data;
  private initialData: Data;

  reset = () => {
    this.data = JSON.parse(JSON.stringify(this.initialData));
  };

  constructor(initialData?: Partial<Data>) {
    this.data = { ...INITIAL_VALUES, ...initialData };
    this.initialData = { ...INITIAL_VALUES, ...initialData };
  }

  // Callbacks
  private createCallbackManager = <V, R = void>() => {
    type Callback = (value: V) => R;
    const callbacks: Callback[] = [];

    const deregister = (callback: Callback) => {
      callbacks.splice(callbacks.indexOf(callback), 1);
    };

    const register = (callback: Callback) => {
      callbacks.push(callback);
      return () => {
        deregister(callback);
      };
    };

    const run = (value: V) => {
      callbacks.forEach((callback) => callback(value));
    };

    return { register, deregister, run };
  };

  private callbacks = {
    context: this.createCallbackManager<DeepPartial<Context> | undefined>(),
    settings: this.createCallbackManager<SegmentAPIIntegrations>(),
    events: this.createCallbackManager<SegmentEvent[]>(),
    userInfo: this.createCallbackManager<UserInfoState>(),
  };

  readonly isReady = {
    get: () => {
      return this.data.isReady;
    },
    onChange: (_callback: (value: boolean) => void) => {
      // Not doing anything cause this mock store is always ready, this is just legacy from the redux persistor
      return () => {};
    },
  };

  readonly context = {
    get: () => ({ ...this.data.context }),
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.callbacks.context.register(callback),
    set: (value: DeepPartial<Context>) => {
      this.data.context = { ...value };
      this.callbacks.context.run(value);
    },
  };

  readonly settings = {
    get: () => this.data.settings,
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.callbacks.settings.register(callback),
    set: (value: SegmentAPIIntegrations) => {
      this.data.settings = value;
      this.callbacks.settings.run(value);
    },
    add: (key: string, value: IntegrationSettings) => {
      this.data.settings[key] = value;
      this.callbacks.settings.run(this.data.settings);
    },
  };

  readonly events = {
    get: () => this.data.events,
    onChange: (callback: (value: SegmentEvent[]) => void) =>
      this.callbacks.events.register(callback),
    add: (event: SegmentEvent | SegmentEvent[]) => {
      const eventsToAdd = Array.isArray(event) ? event : [event];
      this.data.events.push(...eventsToAdd);
      this.callbacks.events.run(this.data.events);
    },
    remove: (event: SegmentEvent | SegmentEvent[]) => {
      const eventsToRemove = Array.isArray(event) ? event : [event];
      const setToRemove = new Set(eventsToRemove);
      this.data.events = this.data.events.filter(
        (callback) => !setToRemove.has(callback)
      );
      this.callbacks.events.run(this.data.events);
    },
  };

  readonly userInfo = {
    get: () => this.data.userInfo,
    onChange: (callback: (value: UserInfoState) => void) =>
      this.callbacks.userInfo.register(callback),
    set: (value: UserInfoState) => {
      this.data.userInfo = value;
      this.callbacks.userInfo.run(value);
    },
  };
}
