import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import * as context from '../../context';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';
import { Context, EventType } from '../../types';

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

const currentContext = {
  app: {
    version: '1.0',
    build: '1',
  },
} as Context;

describe('internal #checkInstalledVersion', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
      trackAppLifecycleEvents: false,
    },
    logger: getMockLogger(),
    store: store,
  };
  let client: SegmentClient;

  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    client.cleanup();
  });

  it('updates the context with the new value', async () => {
    client = new SegmentClient(clientArgs);
    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    await client.init();
    expect(store.context.get()).toEqual(currentContext);
  });

  it('does not send any events when trackAppLifecycleEvents is false', async () => {
    client = new SegmentClient(clientArgs);

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.init();

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('calls the application installed and opened events when there is no previous context', async () => {
    client = new SegmentClient({
      ...clientArgs,
      config: {
        ...clientArgs.config,
        trackAppLifecycleEvents: true,
      },
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.init();

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
    client = new SegmentClient({
      ...clientArgs,
      config: {
        ...clientArgs.config,
        trackAppLifecycleEvents: true,
      },
      store: new MockSegmentStore({
        context: {
          app: {
            version: '2.0',
            build: '2',
          },
        },
      }),
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.init();

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
    client = new SegmentClient({
      ...clientArgs,
      config: {
        ...clientArgs.config,
        trackAppLifecycleEvents: true,
      },
      store: new MockSegmentStore({
        context: { ...currentContext },
      }),
    });

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    const processSpy = jest.spyOn(client, 'process');

    await client.init();

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
