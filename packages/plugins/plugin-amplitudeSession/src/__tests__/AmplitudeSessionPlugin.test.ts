/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AmplitudeSessionPlugin } from '../AmplitudeSessionPlugin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EventType,
  TrackEventType,
  IdentifyEventType,
  ScreenEventType,
  SegmentAPISettings,
  SegmentEvent,
  UpdateType,
} from '@segment/analytics-react-native';
import { AppState } from 'react-native';

const MAX_SESSION_TIME_IN_MS = 300000;
const KEY = 'Actions Amplitude';

interface EmittedSessionEvent {
  name: string;
  sessionId?: number;
  timestamp?: string;
}

type Enrichment = (event: SegmentEvent) => SegmentEvent;

const sessionIdOf = (event: SegmentEvent) =>
  (event.integrations?.[KEY] as { session_id?: number } | undefined)
    ?.session_id;

const makeTrackEvent = (
  event: string,
  overrides: Partial<TrackEventType> = {}
): TrackEventType => ({
  type: EventType.TrackEvent,
  event,
  properties: {},
  messageId: `msg-${event}`,
  timestamp: '2023-01-01T00:00:00.000Z',
  anonymousId: 'anon-1',
  ...overrides,
});

describe('AmplitudeSessionPlugin', () => {
  let plugin: AmplitudeSessionPlugin;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let emitted: EmittedSessionEvent[];
  let client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    plugin = new AmplitudeSessionPlugin();
    emitted = [];

    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    client = {
      logger: { warn: jest.fn(), info: jest.fn() },
      // Mirrors the timeline: enrichment plugins run, then the closure is applied to the result
      track: jest.fn(
        (name: string, _props: unknown, enrichment?: Enrichment) => {
          const raw = makeTrackEvent(name, {
            messageId: `msg-${emitted.length}`,
            // Core stamps this at process() entry, before the closure runs
            timestamp: new Date(Date.now()).toISOString(),
          });
          const enriched = enrichment === undefined ? raw : enrichment(raw);
          emitted.push({
            name,
            sessionId: sessionIdOf(enriched),
            timestamp: enriched.timestamp,
          });
          return Promise.resolve();
        }
      ),
    };
  });

  afterEach(() => {
    plugin.cleanup();
    jest.useRealTimers();
  });

  const setupPluginWithClient = async () => {
    await plugin.configure(client);
    plugin.update(
      { integrations: { [KEY]: {} } } as SegmentAPISettings,
      UpdateType.initial
    );
    return { client };
  };

  const named = (name: string) => emitted.filter((e) => e.name === name);
  const starts = () => named('session_start');
  const ends = () => named('session_end');

  describe('session lifecycle', () => {
    it('starts exactly one session on a cold start', async () => {
      await setupPluginWithClient();

      expect(plugin.sessionId).toBeGreaterThan(0);
      expect(starts()).toHaveLength(1);
      expect(ends()).toHaveLength(0);
      expect(starts()[0].sessionId).toBe(plugin.sessionId);
    });

    it('does not start a new session while the current one is live', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const sessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + 30000);
      await plugin.execute(makeTrackEvent('test_event'));

      expect(plugin.sessionId).toBe(sessionId);
      expect(starts()).toHaveLength(1);
    });

    it('rotates the session once it has expired', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const oldSessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1000);
      await plugin.execute(makeTrackEvent('test_event'));

      expect(plugin.sessionId).toBeGreaterThan(oldSessionId);
      expect(starts()).toHaveLength(2);
      expect(ends()).toHaveLength(1);
      expect(ends()[0].sessionId).toBe(oldSessionId);
      expect(starts()[1].sessionId).toBe(plugin.sessionId);
    });

    it('expires exactly at MAX_SESSION_TIME_IN_MS', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const oldSessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS);
      await plugin.execute(makeTrackEvent('test_event'));

      expect(plugin.sessionId).not.toBe(oldSessionId);
      expect(ends()[0].sessionId).toBe(oldSessionId);
    });

    it('does not expire one millisecond before the limit', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const sessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS - 1);
      await plugin.execute(makeTrackEvent('test_event'));

      expect(plugin.sessionId).toBe(sessionId);
      expect(starts()).toHaveLength(1);
      expect(ends()).toHaveLength(0);
    });
  });

  describe('regressions: duplicate and mismatched sessions', () => {
    it('mints one session for concurrent events on a cold start', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const events = Array.from({ length: 5 }, (_, i) =>
        makeTrackEvent(`test_event_${i}`, { messageId: `msg-${i}` })
      );
      const results = await Promise.all(
        events.map((event) => plugin.execute(event))
      );

      expect(starts()).toHaveLength(1);
      results.forEach((result) => {
        expect(sessionIdOf(result)).toBe(plugin.sessionId);
      });
    });

    it('never stamps a session id of -1', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          plugin.execute(makeTrackEvent(`e_${i}`, { messageId: `msg-${i}` }))
        )
      );

      results.forEach((result) =>
        expect(sessionIdOf(result)).toBeGreaterThan(0)
      );
      emitted.forEach((event) => expect(event.sessionId).toBeGreaterThan(0));
    });

    it('ends the old session with the old id, not the newly started one', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const oldSessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1);
      await plugin.execute(makeTrackEvent('test_event'));

      expect(ends()[0].sessionId).toBe(oldSessionId);
      expect(ends()[0].sessionId).not.toBe(plugin.sessionId);
    });

    it('dates session_end to the last activity, not to when it was delivered', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      jest.setSystemTime(baseTime + 60000);
      await plugin.execute(makeTrackEvent('last_real_activity'));

      // App killed for an hour; the rotation only happens on relaunch
      jest.setSystemTime(baseTime + 3600000);
      await plugin.execute(makeTrackEvent('after_relaunch'));

      expect(ends()).toHaveLength(1);
      expect(ends()[0].timestamp).toBe(
        new Date(baseTime + 60000).toISOString()
      );
    });

    it('leaves session_start dated when it actually happened', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      expect(starts()[0].timestamp).toBe(new Date(baseTime).toISOString());
    });

    it('does not backdate session_end when there was no prior activity', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      mockAsyncStorage.getItem.mockImplementation((key: string) =>
        Promise.resolve(key === 'previous_session_id' ? '12345' : null)
      );

      const resumed = new AmplitudeSessionPlugin();
      await resumed.configure(client);

      expect(ends()).toHaveLength(1);
      expect(ends()[0].timestamp).toBe(new Date(baseTime).toISOString());
      resumed.cleanup();
    });

    it('emits one session_end per rotation under concurrent events', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const oldSessionId = plugin.sessionId;
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1);

      await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          plugin.execute(makeTrackEvent(`e_${i}`, { messageId: `msg-${i}` }))
        )
      );

      expect(ends()).toHaveLength(1);
      expect(starts()).toHaveLength(2);
      expect(ends()[0].sessionId).toBe(oldSessionId);
    });

    it('gives session markers the same id as the events around them', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      const before = await plugin.execute(makeTrackEvent('before'));
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1);
      const after = await plugin.execute(makeTrackEvent('after'));

      expect(sessionIdOf(before)).toBe(starts()[0].sessionId);
      expect(ends()[0].sessionId).toBe(sessionIdOf(before));
      expect(sessionIdOf(after)).toBe(starts()[1].sessionId);
    });

    it('keeps rotating sessions when a session_start is dropped downstream', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      // Simulate a downstream plugin swallowing the session_start event
      client.track.mockImplementation(() => Promise.resolve());

      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1);
      await plugin.execute(makeTrackEvent('one'));
      const secondSessionId = plugin.sessionId;

      jest.setSystemTime(baseTime + 2 * (MAX_SESSION_TIME_IN_MS + 1));
      await plugin.execute(makeTrackEvent('two'));

      expect(plugin.sessionId).toBeGreaterThan(secondSessionId);
    });

    it('round-trips its own session events without cascading', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      // Feed emitted session events back through the plugin, as the timeline does
      client.track.mockImplementation(
        async (name: string, _props: unknown, enrichment?: Enrichment) => {
          const raw = makeTrackEvent(name, {
            messageId: `msg-${emitted.length}`,
          });
          const processed = await plugin.execute(raw);
          const enriched =
            enrichment === undefined ? processed : enrichment(processed);
          emitted.push({ name, sessionId: sessionIdOf(enriched) });
        }
      );

      await setupPluginWithClient();
      await plugin.execute(makeTrackEvent('test_event'));

      expect(starts()).toHaveLength(1);
      expect(starts()[0].sessionId).toBe(plugin.sessionId);
    });
  });

  describe('app state changes', () => {
    let handler: (nextAppState: any) => void;

    beforeEach(async () => {
      const spy = jest.spyOn(AppState, 'addEventListener');
      await setupPluginWithClient();
      expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
      handler = spy.mock.calls[0][1];
    });

    it('starts a new session when foregrounding after expiry', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      const oldSessionId = plugin.sessionId;

      handler('background');
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1000);
      handler('active');

      expect(plugin.sessionId).toBeGreaterThan(oldSessionId);
      expect(ends()[0].sessionId).toBe(oldSessionId);
    });

    it('does not start a new session when foregrounding before expiry', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      const sessionId = plugin.sessionId;

      handler('background');
      jest.setSystemTime(baseTime + 20000);
      handler('active');

      expect(plugin.sessionId).toBe(sessionId);
      expect(starts()).toHaveLength(1);
    });

    it('ignores inactive/active churn without a real backgrounding', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      const sessionId = plugin.sessionId;

      // iOS fires these for Control Center, notification banners and permission dialogs
      handler('inactive');
      handler('active');
      handler('inactive');
      handler('active');

      expect(plugin.sessionId).toBe(sessionId);
      expect(starts()).toHaveLength(1);
      expect(ends()).toHaveLength(0);
    });

    it('records lastEventTime when backgrounding', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      handler('background');

      expect(plugin.lastEventTime).toBe(baseTime);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'last_event_time',
        baseTime.toString()
      );
    });

    it('stops responding to app state changes after cleanup', () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      const sessionId = plugin.sessionId;

      plugin.cleanup();
      jest.setSystemTime(baseTime + MAX_SESSION_TIME_IN_MS + 1000);
      handler('background');
      handler('active');

      expect(plugin.sessionId).toBe(sessionId);
    });
  });

  describe('persistence', () => {
    it('resumes a live session from storage without starting a new one', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(String(baseTime - 1000))
        .mockResolvedValueOnce(String(baseTime - 1000));

      await plugin.configure(client);

      expect(plugin.sessionId).toBe(baseTime - 1000);
      expect(plugin.lastEventTime).toBe(baseTime - 1000);
      expect(starts()).toHaveLength(0);
    });

    it('rotates a stored session that expired while the app was killed', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      const storedSessionId = baseTime - 3 * 24 * 60 * 60 * 1000;

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(String(storedSessionId))
        .mockResolvedValueOnce(String(storedSessionId));

      await plugin.configure(client);

      expect(ends()).toHaveLength(1);
      expect(ends()[0].sessionId).toBe(storedSessionId);
      expect(starts()).toHaveLength(1);
      expect(starts()[0].sessionId).toBe(baseTime);
    });

    it('persists the session id', async () => {
      await setupPluginWithClient();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'previous_session_id',
        plugin.sessionId.toString()
      );
    });

    it('does not reload storage once initialised', async () => {
      await setupPluginWithClient();
      const callsAfterInit = mockAsyncStorage.getItem.mock.calls.length;

      await plugin.execute(makeTrackEvent('a'));
      await plugin.execute(makeTrackEvent('b'));

      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(callsAfterInit);
    });

    it('throttles lastEventTime writes across rapid events', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();

      mockAsyncStorage.setItem.mockClear();
      for (let i = 0; i < 5; i++) {
        jest.setSystemTime(baseTime + i * 100);
        await plugin.execute(makeTrackEvent(`e_${i}`));
      }

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('clears all session keys on reset', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      await setupPluginWithClient();
      const oldSessionId = plugin.sessionId;

      jest.setSystemTime(baseTime + 1000);
      await plugin.reset();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'previous_session_id'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'last_event_time'
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'event_session_id'
      );
      expect(ends()[0].sessionId).toBe(oldSessionId);
      expect(plugin.sessionId).not.toBe(oldSessionId);
      expect(plugin.sessionId).toBeGreaterThan(0);
    });
  });

  describe('event enrichment', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('adds session_id to track events', async () => {
      const result = await plugin.execute(makeTrackEvent('test_event'));
      expect(result.integrations?.[KEY]).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('adds session_id to identify events', async () => {
      const event: IdentifyEventType = {
        type: EventType.IdentifyEvent,
        traits: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const result = await plugin.execute(event);
      expect(result.integrations?.[KEY]).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('adds the screen name to screen event properties', async () => {
      const event: ScreenEventType = {
        type: EventType.ScreenEvent,
        name: 'Home Screen',
        properties: { existing: 'prop' },
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const result = (await plugin.execute(event)) as ScreenEventType;

      expect(result.properties).toEqual({
        existing: 'prop',
        name: 'Home Screen',
      });
      expect(result.integrations?.[KEY]).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('preserves an existing session_id', async () => {
      const result = await plugin.execute(
        makeTrackEvent('test_event', {
          integrations: { [KEY]: { session_id: 999999 } },
        })
      );

      expect(result.integrations?.[KEY]).toEqual({ session_id: 999999 });
    });

    it('disables other integrations for Amplitude cloud-mode events', async () => {
      const result = await plugin.execute(
        makeTrackEvent('[Amplitude] Application Opened', {
          integrations: { Braze: true, Mixpanel: true },
        })
      );

      expect(result.integrations).toEqual({
        All: false,
        [KEY]: { session_id: plugin.sessionId },
      });
    });

    it('does not disable integrations for an ordinary event named after Amplitude', async () => {
      const result = await plugin.execute(
        makeTrackEvent('Amplitude Settings Changed', {
          integrations: { Braze: true },
        })
      );

      expect(result.integrations).toEqual({
        Braze: true,
        [KEY]: { session_id: plugin.sessionId },
      });
    });

    it('leaves events untouched when the destination is not configured', async () => {
      const inactive = new AmplitudeSessionPlugin();
      await inactive.configure(client);
      inactive.update(
        { integrations: {} } as SegmentAPISettings,
        UpdateType.initial
      );

      const result = await inactive.execute(makeTrackEvent('test_event'));

      expect(result.integrations?.[KEY]).toBeUndefined();
      inactive.cleanup();
    });
  });
});
