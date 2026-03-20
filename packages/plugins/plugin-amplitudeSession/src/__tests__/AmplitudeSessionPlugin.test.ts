/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AmplitudeSessionPlugin } from '../AmplitudeSessionPlugin';
const MAX_SESSION_TIME_IN_MS = 300000;
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EventType,
  TrackEventType,
  IdentifyEventType,
  ScreenEventType,
  SegmentAPISettings,
  UpdateType,
} from '@segment/analytics-react-native';
import { AppState } from 'react-native';

describe('AmplitudeSessionPlugin', () => {
  let plugin: AmplitudeSessionPlugin;
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    plugin = new AmplitudeSessionPlugin();

    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockAsyncStorage.multiSet.mockResolvedValue();
    mockAsyncStorage.multiRemove.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setupPluginWithClient = async () => {
    const mockClient = {
      track: jest.fn(),
    } as any;

    await plugin.configure(mockClient);
    plugin.update(
      { integrations: { 'Actions Amplitude': {} } } as SegmentAPISettings,
      UpdateType.initial
    );

    return { client: mockClient };
  };

  describe('startNewSession scenarios', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('should start a new session when sessionId is -1', async () => {
      plugin.sessionId = -1;
      plugin.lastEventTime = -1;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      await plugin.execute(mockEvent);

      expect(plugin.sessionId).toBeGreaterThan(0);
      expect(plugin.analytics?.track).toHaveBeenCalledWith('session_start', {
        integrations: {
          'Actions Amplitude': { session_id: plugin.sessionId },
        },
      });
    });

    it('should start a new session when session has expired (>MAX_SESSION_TIME_IN_MS)', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);
      plugin.active = true;
      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 1000);

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const oldSessionId = plugin.sessionId;
      await plugin.execute(mockEvent);

      expect(plugin.sessionId).not.toBe(oldSessionId);
      expect(plugin.sessionId).toBeGreaterThan(oldSessionId);
      expect(plugin.analytics?.track).toHaveBeenCalledWith('session_end', {
        integrations: {
          'Actions Amplitude': { session_id: oldSessionId },
        },
      });
      expect(plugin.analytics?.track).toHaveBeenCalledWith('session_start', {
        integrations: {
          'Actions Amplitude': { session_id: plugin.sessionId },
        },
      });
    });

    it('should NOT start a new session when session is still active', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const oldSessionId = plugin.sessionId;
      await plugin.execute(mockEvent);

      expect(plugin.sessionId).toBe(oldSessionId);
      expect(plugin.analytics?.track).not.toHaveBeenCalledWith(
        'session_start',
        expect.any(Object)
      );
    });
  });

  describe('session transition concurrency', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('should produce exactly 1 session_start for parallel execute() calls on fresh session', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = -1;
      plugin.lastEventTime = -1;

      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        type: EventType.TrackEvent,
        event: `test_event_${i}`,
        properties: {},
        messageId: `msg-${i}`,
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      })) as TrackEventType[];

      const promises = mockEvents.map((event) => plugin.execute(event));
      await Promise.all(promises);

      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      expect(sessionStartCalls).toHaveLength(1);
    });

    it('should produce exactly 1 session_end + 1 session_start for concurrent expired-session execute() calls', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000);

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const promises = [
        plugin.execute({ ...mockEvent, messageId: 'msg-1' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-2' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-3' }),
      ];

      await Promise.all(promises);

      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionEndCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_end'
      );
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      expect(sessionEndCalls).toHaveLength(1);
      expect(sessionStartCalls).toHaveLength(1);
    });

    it('should handle inconsistent state (sessionId set, lastEventTime = -1)', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === 'previous_session_id') {
          return (baseTime - 1000).toString();
        }
        return null;
      });

      // eslint-disable-next-line dot-notation
      plugin['_sessionId'] = baseTime - 1000;
      // eslint-disable-next-line dot-notation
      plugin['_lastEventTime'] = -1;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      await plugin.execute(mockEvent);

      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      expect(sessionStartCalls).toHaveLength(1);
      expect(plugin.sessionId).toBeGreaterThan(0);
      expect(plugin.lastEventTime).toBeGreaterThan(0);
    });

    it('should maintain single session for sequential events within session timeout', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = -1;
      plugin.lastEventTime = -1;

      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        type: EventType.TrackEvent,
        event: `test_event_${i}`,
        properties: {},
        messageId: `msg-${i}`,
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      })) as TrackEventType[];

      for (let i = 0; i < mockEvents.length; i++) {
        jest.setSystemTime(baseTime + i * 10000);
        await plugin.execute(mockEvents[i]);
      }

      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      expect(sessionStartCalls).toHaveLength(1);
      expect(plugin.sessionId).toBeGreaterThan(0);
    });
  });

  describe('session expiration scenarios', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('should expire session exactly at MAX_SESSION_TIME_IN_MS', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - MAX_SESSION_TIME_IN_MS;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const oldSessionId = plugin.sessionId;
      await plugin.execute(mockEvent);

      expect(plugin.sessionId).not.toBe(oldSessionId);
      expect(plugin.analytics?.track).toHaveBeenCalledWith('session_end', {
        integrations: {
          'Actions Amplitude': { session_id: oldSessionId },
        },
      });
    });

    it('should NOT expire session at MAX_SESSION_TIME_IN_MS - 1 second', async () => {
      const fixedNow = 1761550980000;
      const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fixedNow);

      plugin.sessionId = fixedNow - 1000;
      plugin.lastEventTime = fixedNow - (MAX_SESSION_TIME_IN_MS - 2);

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const oldSessionId = plugin.sessionId;
      await plugin.execute(mockEvent);

      expect(plugin.sessionId).toBe(oldSessionId);
      expect(plugin.analytics?.track).not.toHaveBeenCalledWith(
        'session_start',
        expect.any(Object)
      );
      expect(plugin.analytics?.track).not.toHaveBeenCalledWith(
        'session_end',
        expect.any(Object)
      );

      nowSpy.mockRestore();
    });
  });

  describe('app state change scenarios', () => {
    let appStateChangeHandler: (nextAppState: any) => void;

    beforeEach(async () => {
      const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
      await setupPluginWithClient();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      appStateChangeHandler = addEventListenerSpy.mock.calls[0][1];
    });

    it('should start new session when app comes to foreground after expiration', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000);

      const startNewSessionSpy = jest.spyOn(
        plugin as any,
        'startNewSessionIfNecessary'
      );

      appStateChangeHandler('background');
      appStateChangeHandler('active');

      expect(startNewSessionSpy).toHaveBeenCalled();
    });

    it('should NOT start new session when app comes to foreground before expiration', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      appStateChangeHandler('background');
      jest.setSystemTime(baseTime + 20000);
      appStateChangeHandler('active');

      expect(plugin.analytics?.track).not.toHaveBeenCalled();
    });

    it('should update lastEventTime when app goes to background', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      appStateChangeHandler('background');

      expect(plugin.lastEventTime).toBe(baseTime);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should treat inactive → active as foreground transition', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000);

      const startNewSessionSpy = jest.spyOn(
        plugin as any,
        'startNewSessionIfNecessary'
      );

      appStateChangeHandler('inactive');
      appStateChangeHandler('active');

      expect(startNewSessionSpy).toHaveBeenCalled();
    });

    it('should treat active → inactive as background transition', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      appStateChangeHandler('inactive');

      expect(plugin.lastEventTime).toBe(baseTime);
    });

    it('should not double-trigger for active → inactive → background', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      const onBackgroundSpy = jest.spyOn(plugin as any, 'onBackground');

      appStateChangeHandler('inactive');
      appStateChangeHandler('background');

      expect(onBackgroundSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('session data persistence', () => {
    it('should load session data from AsyncStorage on configure', async () => {
      const mockSessionId = '1234567890';
      const mockLastEventTime = '1234567000';

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(mockSessionId)
        .mockResolvedValueOnce(mockLastEventTime);

      const mockClient = { track: jest.fn() } as any;
      await plugin.configure(mockClient);

      expect(plugin.sessionId).toBe(1234567890);
      expect(plugin.lastEventTime).toBe(1234567000);
    });

    it('should batch-persist session fields with multiSet during transition', async () => {
      await setupPluginWithClient();

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      await plugin.execute(mockEvent);

      expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith([
        ['previous_session_id', plugin.sessionId.toString()],
        ['last_event_time', plugin.sessionId.toString()],
      ]);
    });

    it('should clear session data on reset and fire session_end', async () => {
      const { client } = await setupPluginWithClient();

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };
      await plugin.execute(mockEvent);

      const sessionIdBeforeReset = plugin.sessionId;
      client.track.mockClear();

      await plugin.reset();

      expect(plugin.sessionId).toBe(-1);
      expect(plugin.lastEventTime).toBe(-1);
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'previous_session_id',
        'last_event_time',
      ]);
      expect(client.track).toHaveBeenCalledWith('session_end', {
        integrations: {
          'Actions Amplitude': { session_id: sessionIdBeforeReset },
        },
      });
    });

    it('should NOT fire session_end on reset when no active session', async () => {
      const { client } = await setupPluginWithClient();

      await plugin.reset();

      expect(client.track).not.toHaveBeenCalledWith(
        'session_end',
        expect.any(Object)
      );
    });
  });

  describe('event enrichment', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('should add session_id to track events', async () => {
      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const result = await plugin.execute(mockEvent);

      expect(result.integrations?.['Actions Amplitude']).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('should add session_id to identify events', async () => {
      const mockEvent: IdentifyEventType = {
        type: EventType.IdentifyEvent,
        traits: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const result = await plugin.execute(mockEvent);

      expect(result.integrations?.['Actions Amplitude']).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('should add name property to screen events', async () => {
      const mockEvent: ScreenEventType = {
        type: EventType.ScreenEvent,
        name: 'Home Screen',
        properties: { existing: 'prop' },
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      const result = (await plugin.execute(mockEvent)) as ScreenEventType;

      expect(result.properties).toEqual({
        existing: 'prop',
        name: 'Home Screen',
      });
      expect(result.integrations?.['Actions Amplitude']).toEqual({
        session_id: plugin.sessionId,
      });
    });

    it('should NOT modify events when session_id already exists', async () => {
      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
        integrations: {
          'Actions Amplitude': { session_id: 999999 },
        },
      };

      const result = await plugin.execute(mockEvent);

      expect(result.integrations?.['Actions Amplitude']).toEqual({
        session_id: 999999,
      });
    });
  });
});
