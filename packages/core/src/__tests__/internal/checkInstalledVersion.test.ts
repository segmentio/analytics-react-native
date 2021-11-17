import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import { Context, EventType } from '../../types';
import * as context from '../../context';
import { mockPersistor } from '../__helpers__/mockPersistor';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

const currentContext = {
  app: {
    version: '1.0',
    build: '1',
  },
} as Context;

const defaultClientConfig = {
  config: {
    writeKey: 'mock-write-key',
    trackAppLifecycleEvents: false,
  },
  logger: getMockLogger(),
  store: {
    dispatch: jest.fn() as jest.MockedFunction<any>,
    getState: () => ({
      main: {
        context: currentContext,
      },
      userInfo: {
        anonymousId: 'very-anonymous',
      },
    }),
  },
  persistor: mockPersistor,
  actions: {
    main: {
      updateContext: jest.fn() as jest.MockedFunction<any>,
    },
  },
};

describe('internal #checkInstalledVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the context with the new value', async () => {
    const client = new SegmentClient(defaultClientConfig);
    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);

    await client.checkInstalledVersion();

    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(client.actions.main.updateContext).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(client.actions.main.updateContext).toHaveBeenCalledWith({
      context: currentContext,
    });
  });

  it('does not send any events when trackAppLifecycleEvents is false', async () => {
    const client = new SegmentClient(defaultClientConfig);

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.checkInstalledVersion();

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('calls the application installed and opened events when there is no previous context', async () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: 'mock-write-key',
        trackAppLifecycleEvents: true,
      },
      store: {
        ...defaultClientConfig.store,
        getState: () => ({
          main: {
            context: undefined,
          },
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.checkInstalledVersion();

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Installed',
      properties: {
        build: '1',
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        build: '1',
        from_background: false,
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });
  });

  it('calls the application updated and opened events when the previous version is different from current', async () => {
    const savedContext = {
      app: {
        version: '2.0',
        build: '2',
      },
    };
    const client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: 'mock-write-key',
        trackAppLifecycleEvents: true,
      },
      store: {
        ...defaultClientConfig.store,
        getState: () => ({
          main: {
            context: savedContext,
          },
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.checkInstalledVersion();

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Updated',
      properties: {
        build: '1',
        previous_build: '2',
        previous_version: '2.0',
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });

    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        build: '1',
        from_background: false,
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });
  });

  it('only sends the app opened event when the versions match', async () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: 'mock-write-key',
        trackAppLifecycleEvents: true,
      },
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.checkInstalledVersion();

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: false,
        version: currentContext.app.version,
        build: currentContext.app.build,
      },
      type: EventType.TrackEvent,
    });
  });
});
