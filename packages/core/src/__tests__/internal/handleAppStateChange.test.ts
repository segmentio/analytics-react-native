import type { SegmentClientContext } from '../../client';
import handleAppStateChange from '../../internal/handleAppStateChange';
import { EventType } from '../../types';
import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('SegmentClient #handleAppStateChange', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('does not send events when trackAppLifecycleEvents is not enabled', () => {
    const clientContext = {
      appState: 'active',
      config: {
        trackAppLifecycleEvents: false,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'background' });

    expect(clientContext.store.dispatch).not.toHaveBeenCalled();
    expect(clientContext.appState).toBe('background');
  });

  it('sends an event when inactive => active', () => {
    const clientContext = {
      appState: 'inactive',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'active' });

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: '1',
        version: '1.2',
      },
      type: EventType.TrackEvent,
    });
    expect(clientContext.appState).toBe('active');
  });

  it('sends an event when background => active', () => {
    const clientContext = {
      appState: 'background',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'active' });

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: '1',
        version: '1.2',
      },
      type: EventType.TrackEvent,
    });
    expect(clientContext.appState).toBe('active');
  });

  it('sends an event when active => inactive', () => {
    const clientContext = {
      appState: 'active',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'inactive' });

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      type: EventType.TrackEvent,
      properties: {},
    });
    expect(clientContext.appState).toBe('inactive');
  });

  it('sends an event when active => background', () => {
    const clientContext = {
      appState: 'active',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'background' });

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      type: EventType.TrackEvent,
      properties: {},
    });
    expect(clientContext.appState).toBe('background');
  });

  it('does not send an event when unknown => active', () => {
    const clientContext = {
      appState: 'unknown',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'active' });

    expect(clientContext.process).not.toHaveBeenCalled();
    expect(clientContext.appState).toBe('active');
  });

  it('does not send an event when unknown => background', () => {
    const clientContext = {
      appState: 'unknown',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'background' });

    expect(clientContext.process).not.toHaveBeenCalled();
    expect(clientContext.appState).toBe('background');
  });

  it('does not send an event when unknown => inactive', () => {
    const clientContext = {
      appState: 'unknown',
      config: {
        trackAppLifecycleEvents: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'my-id',
            userId: 'user-id',
          },
          main: {
            context: { app: { build: '1', version: '1.2' } },
          },
        }),
      },
      actions: {
        main: {
          addEvent: jest.fn() as jest.MockedFunction<any>,
        },
      },
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    handleAppStateChange.bind(clientContext)({ nextAppState: 'inactive' });

    expect(clientContext.process).not.toHaveBeenCalled();
    expect(clientContext.appState).toBe('inactive');
  });
});
