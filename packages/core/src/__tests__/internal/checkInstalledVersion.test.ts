import type { SegmentClientContext } from '../../client';
import checkInstalledVersion from '../../internal/checkInstalledVersion';
import { getMockLogger } from '../__helpers__/mockLogger';
import { Context, EventType } from '../../types';
import * as context from '../../context';

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

describe('internal #checkInstalledVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates the context with the new value', async () => {
    const clientContext = {
      config: {
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
      actions: {
        main: {
          updateContext: jest.fn() as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;
    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);

    await checkInstalledVersion.bind(clientContext)();

    expect(clientContext.store.dispatch).toHaveBeenCalledTimes(1);
    expect(clientContext.actions.main.updateContext).toHaveBeenCalledTimes(1);
    expect(clientContext.actions.main.updateContext).toHaveBeenCalledWith({
      context: currentContext,
    });
  });

  it('does not send any events when trackAppLifecycleEvents is false', async () => {
    const clientContext = {
      config: {
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
      actions: {
        main: {
          updateContext: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);

    await checkInstalledVersion.bind(clientContext)();

    expect(clientContext.process).not.toHaveBeenCalled();
  });

  it('calls the application installed and opened events when there is no previous context', async () => {
    const clientContext = {
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            context: undefined,
          },
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
      actions: {
        main: {
          updateContext: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;
    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    await checkInstalledVersion.bind(clientContext)();

    expect(clientContext.process).toHaveBeenCalledTimes(2);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Installed',
      properties: {
        build: '1',
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });
    expect(clientContext.process).toHaveBeenCalledWith({
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
    const clientContext = {
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            context: savedContext,
          },
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
      actions: {
        main: {
          updateContext: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);
    await checkInstalledVersion.bind(clientContext)();

    expect(clientContext.process).toHaveBeenCalledTimes(2);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Updated',
      properties: {
        build: '1',
        previous_build: '2',
        previous_version: '2.0',
        version: '1.0',
      },
      type: EventType.TrackEvent,
    });

    expect(clientContext.process).toHaveBeenCalledWith({
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
    const clientContext = {
      config: {
        trackAppLifecycleEvents: true,
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
      actions: {
        main: {
          updateContext: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest.spyOn(context, 'getContext').mockResolvedValueOnce(currentContext);

    await checkInstalledVersion.bind(clientContext)();

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
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
