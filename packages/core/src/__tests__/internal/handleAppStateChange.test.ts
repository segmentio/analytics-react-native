import { SegmentClient } from '../../analytics';
import { EventType } from '../../types';
import { getMockLogger } from '../__helpers__/mockLogger';
import { mockPersistor } from '../__helpers__/mockPersistor';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

const defaultClientConfig = {
  config: {
    writeKey: '',
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
      main: {
        context: {
          app: {
            build: '1',
            version: '1.2',
          },
        },
      },
    }),
  },
  actions: {
    main: {
      addEvent: jest.fn() as jest.MockedFunction<any>,
    },
  },
  persistor: mockPersistor,
};

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
    let segmentClient = new SegmentClient(defaultClientConfig);
    segmentClient.handleAppStateChange('background');

    // @ts-ignore
    expect(segmentClient.store.dispatch).not.toHaveBeenCalled();
    // @ts-ignore
    expect(segmentClient.appState).toBe('background');
  });

  it('sends an event when inactive => active', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'inactive';

    const clientProcess = jest.spyOn(client, 'process');
    client.handleAppStateChange('active');

    expect(clientProcess).toHaveBeenCalledTimes(1);
    expect(clientProcess).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: '1',
        version: '1.2',
      },
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('sends an event when background => active', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'background';

    const clientProcess = jest.spyOn(client, 'process');
    client.handleAppStateChange('active');

    expect(clientProcess).toHaveBeenCalledTimes(1);
    expect(clientProcess).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: '1',
        version: '1.2',
      },
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('sends an event when active => inactive', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'active';

    const clientProcess = jest.spyOn(client, 'process');

    client.handleAppStateChange('inactive');

    expect(clientProcess).toHaveBeenCalledTimes(1);
    expect(clientProcess).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      type: EventType.TrackEvent,
      properties: {},
    });
    // @ts-ignore
    expect(client.appState).toBe('inactive');
  });

  it('sends an event when active => background', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'active';

    const clientProcess = jest.spyOn(client, 'process');

    client.handleAppStateChange('background');

    expect(clientProcess).toHaveBeenCalledTimes(1);
    expect(clientProcess).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      type: EventType.TrackEvent,
      properties: {},
    });
    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('does not send an event when unknown => active', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'unknown';

    const clientProcess = jest.spyOn(client, 'process');

    client.handleAppStateChange('active');

    expect(clientProcess).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('does not send an event when unknown => background', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'unknown';

    const clientProcess = jest.spyOn(client, 'process');

    client.handleAppStateChange('background');

    expect(clientProcess).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('does not send an event when unknown => inactive', () => {
    let client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: '',
        trackAppLifecycleEvents: true,
      },
    });
    // @ts-ignore
    client.appState = 'unknown';

    const clientProcess = jest.spyOn(client, 'process');

    client.handleAppStateChange('inactive');

    expect(clientProcess).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('inactive');
  });
});
