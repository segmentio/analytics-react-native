import { SEGMENT_DESTINATION_KEY } from '../../plugins/SegmentDestination';
import type {
  DeepLinkData,
  Dictionary,
  Settable,
  Storage,
  Watchable,
} from '../../storage';
import type {
  Context,
  DeepPartial,
  IntegrationSettings,
  SegmentAPIIntegrations,
  UserInfoState,
} from '../../types';
import { createCallbackManager } from './utils';
import { createGetter } from '../../storage/helpers';

type Data = {
  isReady: boolean;
  context?: DeepPartial<Context>;
  settings: SegmentAPIIntegrations;
  userInfo: UserInfoState;
  deepLinkData: DeepLinkData;
};

const INITIAL_VALUES: Data = {
  isReady: true,
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

export function createMockStoreGetter<T>(fn: () => T) {
  return createGetter(fn, () => {
    return new Promise((resolve) => {
      resolve(fn());
    });
  });
}

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
    userInfo: createCallbackManager<UserInfoState>(),
    deepLinkData: createCallbackManager<DeepLinkData>(),
  };

  readonly isReady = {
    get: createMockStoreGetter(() => {
      return this.data.isReady;
    }),
    onChange: (_callback: (value: boolean) => void) => {
      // Not doing anything cause this mock store is always ready, this is just legacy from the redux persistor
      return () => {};
    },
  };

  readonly context: Watchable<DeepPartial<Context> | undefined> &
    Settable<DeepPartial<Context>> = {
    get: createMockStoreGetter(() => ({ ...this.data.context })),
    onChange: (callback: (value?: DeepPartial<Context>) => void) =>
      this.callbacks.context.register(callback),
    set: (value) => {
      this.data.context =
        value instanceof Function
          ? value(this.data.context ?? {})
          : { ...value };
      this.callbacks.context.run(this.data.context);
      return this.data.context;
    },
  };

  readonly settings: Watchable<SegmentAPIIntegrations | undefined> &
    Settable<SegmentAPIIntegrations> &
    Dictionary<string, IntegrationSettings> = {
    get: createMockStoreGetter(() => this.data.settings),
    onChange: (
      callback: (value?: SegmentAPIIntegrations | undefined) => void
    ) => this.callbacks.settings.register(callback),
    set: (value) => {
      this.data.settings =
        value instanceof Function
          ? value(this.data.settings ?? {})
          : { ...value };
      this.callbacks.settings.run(this.data.settings);
      return this.data.settings;
    },
    add: (key: string, value: IntegrationSettings) => {
      this.data.settings[key] = value;
      this.callbacks.settings.run(this.data.settings);
    },
  };

  readonly userInfo: Watchable<UserInfoState> & Settable<UserInfoState> = {
    get: createMockStoreGetter(() => this.data.userInfo),
    onChange: (callback: (value: UserInfoState) => void) =>
      this.callbacks.userInfo.register(callback),
    set: (value) => {
      this.data.userInfo =
        value instanceof Function
          ? value(this.data.userInfo ?? {})
          : { ...value };
      this.callbacks.userInfo.run(this.data.userInfo);
      return this.data.userInfo;
    },
  };

  readonly deepLinkData = {
    get: createMockStoreGetter(() => {
      return this.data.deepLinkData;
    }),
    set: (value: DeepLinkData) => {
      this.data.deepLinkData = value;
      this.callbacks.deepLinkData.run(value);
    },
    onChange: (callback: (value: DeepLinkData) => void) =>
      this.callbacks.deepLinkData.register(callback),
  };
}
