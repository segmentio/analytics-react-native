import { SEGMENT_DESTINATION_KEY } from '../../plugins/SegmentDestination';
import type { DeepLinkData, Storage } from '../../storage';
import type {
  Context,
  DeepPartial,
  IntegrationSettings,
  SegmentAPIIntegrations,
  SegmentEvent,
  UserInfoState,
} from '../../types';
import { createCallbackManager } from './utils';

type Data = {
  isReady: boolean;
  events: SegmentEvent[];
  context?: DeepPartial<Context>;
  settings: SegmentAPIIntegrations;
  userInfo: UserInfoState;
  deepLinkData: DeepLinkData;
};

const INITIAL_VALUES: Data = {
  isReady: true,
  events: [],
  context: undefined,
  settings: {
    [SEGMENT_DESTINATION_KEY]: {},
  },
  userInfo: {
    anonymousId: 'anonymousId',
    userId: undefined,
    traits: undefined,
  },
  deepLinkData: {
    referring_application: '',
    url: '',
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
    this.initialData = JSON.parse(
      JSON.stringify({ ...INITIAL_VALUES, ...initialData })
    );
  }

  private callbacks = {
    context: createCallbackManager<DeepPartial<Context> | undefined>(),
    settings: createCallbackManager<SegmentAPIIntegrations>(),
    events: createCallbackManager<SegmentEvent[]>(),
    userInfo: createCallbackManager<UserInfoState>(),
    deepLinkData: createCallbackManager<DeepLinkData>(),
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
      return this.data.context;
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
      return this.data.settings;
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
      return this.data.userInfo;
    },
  };

  readonly deepLinkData = {
    get: () => {
      return this.data.deepLinkData;
    },
    set: (value: DeepLinkData) => {
      this.data.deepLinkData = value;
      this.callbacks.deepLinkData.run(value);
    },
    onChange: (callback: (value: DeepLinkData) => void) =>
      this.callbacks.deepLinkData.register(callback),
  };
}
