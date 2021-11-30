import { AppState, AppStateStatus } from 'react-native';
import { SegmentClient } from '../../analytics';
import { EventType } from '../../types';
import { getMockLogger } from '../__helpers__/mockLogger';
import { mockPersistor } from '../__helpers__/mockPersistor';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

jest.mock('../../uuid');
jest.mock('../../context');
jest.mock('react-native');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('SegmentClient #handleAppStateChange', () => {
  const store = new MockSegmentStore();

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
      trackAppLifecycleEvents: true,
    },
    logger: getMockLogger(),
    persistor: mockPersistor,
    store: store,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    store.reset();
  });

  const setupTest = async (
    client: SegmentClient,
    from: AppStateStatus,
    to: AppStateStatus
  ) => {
    // @ts-ignore
    client.appState = from;

    let appStateChangeListener: ((state: AppStateStatus) => void) | undefined;
    AppState.addEventListener = jest
      .fn()
      .mockImplementation(
        (_type: String, listener: (state: AppStateStatus) => void) => {
          appStateChangeListener = listener;
        }
      );

    await client.init();
    const clientProcess = jest.spyOn(client, 'process');

    expect(appStateChangeListener).toBeDefined();

    appStateChangeListener!(to);
    return clientProcess;
  };

  it('does not send events when trackAppLifecycleEvents is not enabled', async () => {
    let client = new SegmentClient({
      ...clientArgs,
      config: {
        writeKey: 'mock-write-key',
        trackAppLifecycleEvents: false,
      },
    });
    const processSpy = await setupTest(client, 'active', 'background');

    expect(processSpy).not.toHaveBeenCalled();

    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('sends an event when inactive => active', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'inactive', 'active');

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: store.context.get().app?.build,
        version: store.context.get().app?.version,
      },
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('sends an event when background => active', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'background', 'active');

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: store.context.get().app?.build,
        version: store.context.get().app?.version,
      },
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('sends an event when active => inactive', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'active', 'inactive');

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      properties: {},
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('inactive');
  });

  it('sends an event when active => background', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'active', 'background');

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith({
      event: 'Application Backgrounded',
      properties: {},
      type: EventType.TrackEvent,
    });
    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('does not send an event when unknown => active', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'unknown', 'active');

    expect(processSpy).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('active');
  });

  it('does not send an event when unknown => background', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'unknown', 'background');

    expect(processSpy).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('does not send an event when unknown => inactive', async () => {
    let client = new SegmentClient(clientArgs);
    const processSpy = await setupTest(client, 'unknown', 'inactive');

    expect(processSpy).not.toHaveBeenCalled();
    // @ts-ignore
    expect(client.appState).toBe('inactive');
  });
});
