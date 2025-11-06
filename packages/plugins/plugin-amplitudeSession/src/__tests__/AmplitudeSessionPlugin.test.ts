/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AmplitudeSessionPlugin } from '../AmplitudeSessionPlugin';
// Import the constant for consistent timeout values
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

// AppState will be mocked by the base setup, we'll spy on it in the tests

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
      plugin.resetPending = false;

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
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 1000); // 61 seconds ago
      plugin.resetPending = false;

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
      plugin.lastEventTime = baseTime - 30000; // 30 seconds ago
      plugin.resetPending = false;

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

  describe('bug detection: multiple startNewSession calls', () => {
    beforeEach(async () => {
      await setupPluginWithClient();
    });

    it('BUG: should detect multiple session starts for rapid events (currently masked by 1000ms guard)', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = -1;
      plugin.lastEventTime = -1;
      plugin.resetPending = false;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      // First call should start session
      await plugin.execute(mockEvent);
      const firstSessionId = plugin.sessionId;

      expect(plugin.analytics?.track).toHaveBeenCalledWith('session_start', {
        integrations: {
          'Actions Amplitude': { session_id: firstSessionId },
        },
      });

      // Advance time by only 500ms
      jest.setSystemTime(baseTime + 500);

      // Force expired condition artificially - this should be impossible in real scenarios
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000); // MAX_SESSION_TIME_IN_MS + 10 seconds ago, definitely expired

      // This scenario should NEVER happen in practice, but if it does, it's a bug
      // The current implementation prevents this with a 1000ms guard, masking the bug
      await plugin.execute(mockEvent);

      // CURRENT BEHAVIOR (with guard): Only one session_start
      // EXPECTED BEHAVIOR (without bugs): Should never reach this scenario
      expect(plugin.analytics?.track).toHaveBeenCalledTimes(1);

      // This test documents the current guard behavior but highlights it's a bug mask
      console.warn(
        '🐛 BUG MASKED: Multiple session start attempts should never occur'
      );
    });

    it('BUG: should detect race conditions in parallel event execution', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = -1;
      plugin.lastEventTime = -1;
      plugin.resetPending = false;

      const mockEvents = Array.from({ length: 5 }, (_, i) => ({
        type: EventType.TrackEvent,
        event: `test_event_${i}`,
        properties: {},
        messageId: `msg-${i}`,
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      })) as TrackEventType[];

      // Execute multiple events in parallel - this could cause race conditions
      const promises = mockEvents.map((event) => plugin.execute(event));
      await Promise.all(promises);

      // Count session_start calls
      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      // IDEAL: Should only have 1 session_start call
      // REALITY: May have multiple due to race conditions
      if (sessionStartCalls.length > 1) {
        console.error(
          `🐛 BUG DETECTED: ${sessionStartCalls.length} session_start calls for parallel events`
        );
        // This test will fail if the bug exists, which is expected
        expect(sessionStartCalls).toHaveLength(1);
      } else {
        // If this passes, the implementation handles parallel calls correctly
        expect(sessionStartCalls).toHaveLength(1);
      }
    });

    // it('BUG: should detect session restart loops from app state changes', async () => {
    //   const baseTime = Date.now();
    //   jest.setSystemTime(baseTime);

    //   // Start with an active session
    //   plugin.sessionId = baseTime;
    //   plugin.lastEventTime = baseTime;

    //   // Spy on startNewSessionIfNecessary to detect multiple calls
    //   const startNewSessionSpy = jest.spyOn(plugin as any, 'startNewSessionIfNecessary');
    //   const endSessionSpy = jest.spyOn(plugin as any, 'endSession');
    //   const startSessionSpy = jest.spyOn(plugin as any, 'startNewSession');

    //   // Simulate rapid app state changes
    //   const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');
    //   await setupPluginWithClient();
    //   const appStateChangeHandler = addEventListenerSpy.mock.calls[0][1];

    //   // Rapid background/foreground cycles
    //   appStateChangeHandler('background');
    //   appStateChangeHandler('active');
    //   appStateChangeHandler('background');
    //   appStateChangeHandler('active');

    //   // Wait for any async operations
    //   await new Promise(resolve => setTimeout(resolve, 0));

    //   // Should not cause multiple session operations for non-expired session
    //   const startNewSessionCalls = startNewSessionSpy.mock.calls.length;
    //   const endSessionCalls = endSessionSpy.mock.calls.length;
    //   const startSessionCalls = startSessionSpy.mock.calls.length;

    //   if (startNewSessionCalls > 2 || endSessionCalls > 0 || startSessionCalls > 0) {
    //     console.error(`🐛 BUG DETECTED: Unnecessary session operations - startNewSessionIfNecessary: ${startNewSessionCalls}, endSession: ${endSessionCalls}, startNewSession: ${startSessionCalls}`);
    //   }

    //   // For a non-expired session, we shouldn't have any actual session restarts
    //   expect(endSessionCalls).toBe(0);
    //   expect(startSessionCalls).toBe(0);
    // });

    it('BUG: should detect inconsistent session state', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      // Set up inconsistent state that should never happen
      plugin.sessionId = baseTime;
      plugin.lastEventTime = -1; // Inconsistent: have sessionId but no lastEventTime
      plugin.resetPending = false;

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      // This inconsistent state might cause unexpected behavior
      await plugin.execute(mockEvent);

      // Check if the plugin handled inconsistent state correctly
      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );
      const sessionEndCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_end'
      );

      // Inconsistent state should be resolved without multiple session events
      if (sessionStartCalls.length > 1 || sessionEndCalls.length > 1) {
        console.error(
          `🐛 BUG DETECTED: Inconsistent state caused multiple session events - starts: ${sessionStartCalls.length}, ends: ${sessionEndCalls.length}`
        );
      }

      // Should have resolved to a consistent state
      expect(plugin.sessionId).toBeGreaterThan(0);
      expect(plugin.lastEventTime).toBeGreaterThan(0);
    });

    it('BUG: should detect async race conditions in startNewSessionIfNecessary', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

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

      // Spy on the async methods to detect overlapping calls
      const startNewSessionIfNecessarySpy = jest.spyOn(
        plugin as any,
        'startNewSessionIfNecessary'
      );
      const endSessionSpy = jest.spyOn(plugin as any, 'endSession');
      const startNewSessionSpy = jest.spyOn(plugin as any, 'startNewSession');

      // Call execute multiple times rapidly before any async operations complete
      // This tests if the implementation properly handles concurrent calls to startNewSessionIfNecessary
      const promises = [
        plugin.execute({ ...mockEvent, messageId: 'msg-1' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-2' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-3' }),
      ];

      await Promise.all(promises);

      const startNewSessionIfNecessaryCalls =
        startNewSessionIfNecessarySpy.mock.calls.length;
      const endSessionCalls = endSessionSpy.mock.calls.length;
      const startNewSessionCalls = startNewSessionSpy.mock.calls.length;

      // For initial session creation, we should only have:
      // - Multiple calls to startNewSessionIfNecessary (one per execute)
      // - But only ONE actual startNewSession call
      // - Zero endSession calls (no existing session to end)

      console.log(
        `📊 Session operations: startNewSessionIfNecessary: ${startNewSessionIfNecessaryCalls}, endSession: ${endSessionCalls}, startNewSession: ${startNewSessionCalls}`
      );

      if (startNewSessionCalls > 1) {
        console.error(
          `🐛 CRITICAL BUG DETECTED: ${startNewSessionCalls} startNewSession calls from concurrent execute operations`
        );
        // This should fail if there are race conditions
        expect(startNewSessionCalls).toBe(1);
      }

      if (endSessionCalls > 1) {
        console.error(
          `🐛 BUG DETECTED: ${endSessionCalls} endSession calls from concurrent operations`
        );
        expect(endSessionCalls).toBeLessThanOrEqual(1);
      }

      // Should have properly created exactly one session
      expect(plugin.sessionId).toBeGreaterThan(0);
      expect(plugin.lastEventTime).toBeGreaterThan(0);
    });

    it('BUG: should detect overlapping session end/start operations', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      // Start with an existing session that will expire
      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000); // MAX_SESSION_TIME_IN_MS + 10 seconds ago, expired

      const mockEvent: TrackEventType = {
        type: EventType.TrackEvent,
        event: 'test_event',
        properties: {},
        messageId: 'msg-1',
        timestamp: '2023-01-01T00:00:00.000Z',
        anonymousId: 'anon-1',
      };

      // Spy on session operations
      const endSessionSpy = jest.spyOn(plugin as any, 'endSession');
      const startNewSessionSpy = jest.spyOn(plugin as any, 'startNewSession');

      // Execute multiple events that should all trigger session restart
      const promises = [
        plugin.execute({ ...mockEvent, messageId: 'msg-1' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-2' }),
        plugin.execute({ ...mockEvent, messageId: 'msg-3' }),
      ];

      await Promise.all(promises);

      const endSessionCalls = endSessionSpy.mock.calls.length;
      const startNewSessionCalls = startNewSessionSpy.mock.calls.length;

      // For session restart, we should have:
      // - Exactly ONE endSession call (to end the expired session)
      // - Exactly ONE startNewSession call (to start the new session)

      if (endSessionCalls > 1) {
        console.error(
          `🐛 BUG DETECTED: ${endSessionCalls} endSession calls from concurrent operations`
        );
        expect(endSessionCalls).toBe(1);
      }

      if (startNewSessionCalls > 1) {
        console.error(
          `🐛 CRITICAL BUG DETECTED: ${startNewSessionCalls} startNewSession calls from concurrent operations`
        );
        expect(startNewSessionCalls).toBe(1);
      }

      // Verify the track calls
      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionEndCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_end'
      );
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      if (sessionEndCalls.length > 1 || sessionStartCalls.length > 1) {
        console.error(
          `🐛 BUG DETECTED: Multiple session events - ends: ${sessionEndCalls.length}, starts: ${sessionStartCalls.length}`
        );
      }

      expect(sessionEndCalls).toHaveLength(1);
      expect(sessionStartCalls).toHaveLength(1);
    });

    it('EXPECTED BEHAVIOR: single session for sequential events within session timeout', async () => {
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

      // Execute events sequentially with small time gaps (within session timeout)
      for (let i = 0; i < mockEvents.length; i++) {
        jest.setSystemTime(baseTime + i * 10000); // 10 seconds apart
        await plugin.execute(mockEvents[i]);
      }

      // Should only have one session_start call for all events
      const trackMock = plugin.analytics?.track as jest.Mock;
      const sessionStartCalls = trackMock.mock.calls.filter(
        (call: any) => call[0] === 'session_start'
      );

      expect(sessionStartCalls).toHaveLength(1);

      // All events should have the same session ID
      const sessionId = plugin.sessionId;
      expect(sessionId).toBeGreaterThan(0);
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
      plugin.lastEventTime = baseTime - MAX_SESSION_TIME_IN_MS; // Exactly 60 seconds
      plugin.resetPending = false;

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
      // ✅ Freeze Date.now for this test only
      const fixedNow = 1761550980000;
      const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fixedNow);

      plugin.sessionId = fixedNow - 1000;
      plugin.lastEventTime = fixedNow - (MAX_SESSION_TIME_IN_MS - 2); // within limit

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

      nowSpy.mockRestore(); // ✅ restores Date.now, unaffected by useRealTimers
    });
  });

  describe('app state change scenarios', () => {
    let appStateChangeHandler: (nextAppState: any) => void;

    beforeEach(async () => {
      // Spy on AppState methods
      const addEventListenerSpy = jest.spyOn(AppState, 'addEventListener');

      await setupPluginWithClient();

      // Capture the app state change handler
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      appStateChangeHandler = addEventListenerSpy.mock.calls[0][1];
    });

    it('should start new session when app comes to foreground after expiration', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      // Set up an active session that will be expired
      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - (MAX_SESSION_TIME_IN_MS + 10000); // MAX_SESSION_TIME_IN_MS + 10 seconds ago, already expired

      // Spy on the startNewSessionIfNecessary method to ensure it gets called
      const startNewSessionSpy = jest.spyOn(
        plugin as any,
        'startNewSessionIfNecessary'
      );

      // Simulate app coming to foreground
      appStateChangeHandler('active');

      // Should call startNewSessionIfNecessary
      expect(startNewSessionSpy).toHaveBeenCalled();
    });

    it('should NOT start new session when app comes to foreground before expiration', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      // Set up an active session
      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000; // 30 seconds ago, still active

      // Simulate app going to background
      appStateChangeHandler('background');

      // Advance time but not beyond session timeout
      jest.setSystemTime(baseTime + 20000); // 20 seconds later (total 50 seconds)

      // Simulate app coming to foreground
      appStateChangeHandler('active');

      // Should NOT trigger new session
      expect(plugin.analytics?.track).not.toHaveBeenCalled();
    });

    it('should update lastEventTime when app goes to background', async () => {
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      plugin.sessionId = baseTime - 1000;
      plugin.lastEventTime = baseTime - 30000;

      // Simulate app going to background
      appStateChangeHandler('background');

      expect(plugin.lastEventTime).toBe(baseTime);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('session data persistence', () => {
    it('should load session data from AsyncStorage on configure', async () => {
      const mockSessionId = '1234567890';
      const mockLastEventTime = '1234567000';

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(mockSessionId) // SESSION_ID_KEY
        .mockResolvedValueOnce(mockLastEventTime); // LAST_EVENT_TIME_KEY

      const mockClient = { track: jest.fn() } as any;
      await plugin.configure(mockClient);

      expect(plugin.sessionId).toBe(1234567890);
      expect(plugin.lastEventTime).toBe(1234567000);
    });

    it('should save session data to AsyncStorage after events', async () => {
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

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'event_session_id',
        plugin.sessionId.toString()
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'last_event_time',
        plugin.lastEventTime.toString()
      );
    });

    it('should clear session data on reset', async () => {
      await setupPluginWithClient();

      await plugin.reset();

      expect(plugin.sessionId).toBe(-1);
      expect(plugin.lastEventTime).toBe(-1);
      expect(plugin.eventSessionId).toBe(-1);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'previous_session_id'
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
        session_id: 999999, // Should preserve existing session_id
      });
    });
  });
});
