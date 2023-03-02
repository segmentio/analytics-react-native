import { AppState, AppStateStatus } from 'react-native';
import type { SegmentClient } from '../../analytics';
import type { UtilityPlugin } from '../../plugin';
import { EventType, SegmentEvent } from '../../types';
import type { MockSegmentStore } from '../__helpers__/mockSegmentStore';
import { createTestClient } from '../__helpers__/setupSegmentClient';

jest.mock('uuid');
jest.mock('../../context');
jest.mock('react-native');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('SegmentClient #handleAppStateChange', () => {
  let store: MockSegmentStore;
  let client: SegmentClient;
  let appStateChangeListener: ((state: AppStateStatus) => void) | undefined;
  let expectEvent: (event: Partial<SegmentEvent>) => void;
  let mockPlugin: UtilityPlugin;

  afterEach(() => {
    jest.clearAllMocks();
    store.reset();
    client.cleanup();
  });

  const setupTest = async (
    from: AppStateStatus,
    to: AppStateStatus,
    initialTrackAppLifecycleEvents: boolean = false,
    trackAppLifecycleEvents: boolean = true
  ) => {
    AppState.addEventListener = jest
      .fn()
      .mockImplementation(
        (_type: String, listener: (state: AppStateStatus) => void) => {
          appStateChangeListener = listener;
        }
      );

    const stuff = createTestClient(undefined, {
      trackAppLifecycleEvents: initialTrackAppLifecycleEvents,
    });
    store = stuff.store;
    client = stuff.client;
    expectEvent = stuff.expectEvent;
    mockPlugin = stuff.plugin;

    // @ts-ignore
    client.appState = from;

    await client.init();

    // @ts-ignore settings the track here to filter out initial events
    client.config.trackAppLifecycleEvents = trackAppLifecycleEvents;

    expect(appStateChangeListener).toBeDefined();

    appStateChangeListener!(to);
    // Since the calls to process lifecycle events are not awaitable we have to await for ticks here
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);
    await new Promise(process.nextTick);
  };

  it('does not send events when trackAppLifecycleEvents is not enabled', async () => {
    await setupTest('active', 'background', false, false);

    expect(mockPlugin.execute).not.toHaveBeenCalled();

    // @ts-ignore
    expect(client.appState).toBe('background');
  });

  it('sends an event when inactive => active', async () => {
    await setupTest('inactive', 'active');

    // @ts-ignore
    expect(client.appState).toBe('active');

    expect(mockPlugin.execute).toHaveBeenCalledTimes(1);
    expectEvent({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: store.context.get()?.app?.build,
        version: store.context.get()?.app?.version,
      },
      type: EventType.TrackEvent,
    });
  });

  it('sends an event when background => active', async () => {
    await setupTest('background', 'active');

    // @ts-ignore
    expect(client.appState).toBe('active');

    expect(mockPlugin.execute).toHaveBeenCalledTimes(1);
    expectEvent({
      event: 'Application Opened',
      properties: {
        from_background: true,
        build: store.context.get()?.app?.build,
        version: store.context.get()?.app?.version,
      },
      type: EventType.TrackEvent,
    });
  });

  it('sends an event when active => inactive', async () => {
    await setupTest('active', 'inactive');

    // @ts-ignore
    expect(client.appState).toBe('inactive');

    expect(mockPlugin.execute).toHaveBeenCalledTimes(1);
    expectEvent({
      event: 'Application Backgrounded',
      properties: {},
      type: EventType.TrackEvent,
    });
  });

  it('sends an event when active => background', async () => {
    await setupTest('active', 'background');

    // @ts-ignore
    expect(client.appState).toBe('background');

    expect(mockPlugin.execute).toHaveBeenCalledTimes(1);
    expectEvent({
      event: 'Application Backgrounded',
      properties: {},
      type: EventType.TrackEvent,
    });
  });

  it('sends an event when unknown => active', async () => {
    await setupTest('unknown', 'active');

    // @ts-ignore
    expect(client.appState).toBe('active');

    expect(mockPlugin.execute).not.toHaveBeenCalled();
  });

  it('sends an event when unknown => background', async () => {
    await setupTest('unknown', 'background');

    // @ts-ignore
    expect(client.appState).toBe('background');

    expect(mockPlugin.execute).not.toHaveBeenCalled();
  });

  it('sends an event when unknown => inactive', async () => {
    await setupTest('unknown', 'inactive');

    // @ts-ignore
    expect(client.appState).toBe('inactive');

    expect(mockPlugin.execute).not.toHaveBeenCalled();
  });
});
