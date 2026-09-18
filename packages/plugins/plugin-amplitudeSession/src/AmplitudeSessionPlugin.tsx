import {
  EventPlugin,
  EventType,
  IdentifyEventType,
  PluginType,
  SegmentAPISettings,
  SegmentEvent,
  TrackEventType,
  ScreenEventType,
  GroupEventType,
  UpdateType,
  AliasEventType,
  SegmentClient,
  SegmentAPIIntegrations,
} from '@segment/analytics-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  type AppStateStatus,
  type NativeEventSubscription,
} from 'react-native';

const MAX_SESSION_TIME_IN_MS = 300000;
const SESSION_ID_KEY = 'previous_session_id';
const LAST_EVENT_TIME_KEY = 'last_event_time';
// Written on every event by previous versions; removed on reset so upgrades don't leave it behind
const LEGACY_EVENT_SESSION_ID_KEY = 'event_session_id';
const LAST_EVENT_TIME_PERSIST_INTERVAL_IN_MS = 10000;
// Matches Swift/Kotlin: real cloud-mode names are like "[Amplitude] Application Opened"
const AMP_PREFIX = '[Amplitude] ';
const ALL_INTEGRATIONS_KEY = 'All';
const AMP_SESSION_START_EVENT = 'session_start';
const AMP_SESSION_END_EVENT = 'session_end';

export class AmplitudeSessionPlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Actions Amplitude';
  active = false;

  sessionId = -1;
  lastEventTime = -1;

  private initPromise?: Promise<void>;
  private appStateSubscription?: NativeEventSubscription;
  private appState: AppStateStatus | 'unknown' = 'unknown';
  private lastPersistedEventTime = -1;

  configure = (analytics: SegmentClient): Promise<void> => {
    this.analytics = analytics;
    if (this.initPromise === undefined) {
      this.initPromise = this.initialize();
    }
    return this.initPromise;
  };

  update(settings: SegmentAPISettings, type: UpdateType) {
    if (type !== UpdateType.initial) {
      return;
    }
    this.active = settings.integrations?.hasOwnProperty(this.key) ?? false;
  }

  async execute(event: SegmentEvent) {
    if (!this.active) {
      return event;
    }

    // configure() is not awaited by the client, so events can arrive before storage has loaded
    await this.initPromise;
    this.startNewSessionIfNecessary();

    let result = event;
    switch (result.type) {
      case EventType.IdentifyEvent:
        result = this.identify(result);
        break;
      case EventType.TrackEvent:
        result = this.track(result);
        break;
      case EventType.ScreenEvent:
        result = this.screen(result);
        break;
      case EventType.AliasEvent:
        result = this.alias(result);
        break;
      case EventType.GroupEvent:
        result = this.group(result);
        break;
    }

    this.setLastEventTime(Date.now());
    return result;
  }

  identify(event: IdentifyEventType) {
    return this.insertSession(event) as IdentifyEventType;
  }

  track(event: TrackEventType) {
    const eventName = event.event;

    if (
      eventName.includes(AMP_PREFIX) ||
      eventName === AMP_SESSION_START_EVENT ||
      eventName === AMP_SESSION_END_EVENT
    ) {
      return {
        ...event,
        integrations: this.disableCloudIntegrations(this.readSessionId(event)),
      };
    }

    return this.insertSession(event) as TrackEventType;
  }

  screen(event: ScreenEventType) {
    event.properties = {
      ...event.properties,
      name: event.name,
    };
    return this.insertSession(event) as ScreenEventType;
  }

  group(event: GroupEventType) {
    return this.insertSession(event) as GroupEventType;
  }

  alias(event: AliasEventType) {
    return this.insertSession(event) as AliasEventType;
  }

  async reset() {
    const endedSessionId = this.sessionId;
    const endedAt = this.lastEventTime;

    this.sessionId = -1;
    this.lastEventTime = -1;
    this.lastPersistedEventTime = -1;

    await Promise.all([
      AsyncStorage.removeItem(SESSION_ID_KEY),
      AsyncStorage.removeItem(LAST_EVENT_TIME_KEY),
      AsyncStorage.removeItem(LEGACY_EVENT_SESSION_ID_KEY),
    ]).catch((err) => this.warn('Failed to clear session data', err));

    if (endedSessionId >= 0) {
      this.endSession(endedSessionId, endedAt);
    }
    this.startNewSessionIfNecessary();
  }

  /** Removes the AppState listener. Call when tearing down the client. */
  cleanup() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = undefined;
  }

  private async initialize() {
    try {
      const [storedSessionId, storedLastEventTime] = await Promise.all([
        AsyncStorage.getItem(SESSION_ID_KEY),
        AsyncStorage.getItem(LAST_EVENT_TIME_KEY),
      ]);
      this.sessionId = storedSessionId != null ? Number(storedSessionId) : -1;
      this.lastEventTime =
        storedLastEventTime != null ? Number(storedLastEventTime) : -1;
      this.lastPersistedEventTime = this.lastEventTime;
    } catch (err) {
      this.warn('Failed to load session data', err);
    }

    this.startNewSessionIfNecessary();
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  // Must stay synchronous: with no await inside, concurrent events cannot interleave here
  private startNewSessionIfNecessary() {
    const current = Date.now();
    if (
      this.sessionId >= 0 &&
      current - this.lastEventTime < MAX_SESSION_TIME_IN_MS
    ) {
      return;
    }

    // Captured before the overwrite below, so session_end can be dated to real activity
    const endedAt = this.lastEventTime;

    // Must precede endSession: while sessionId is still the old one, this closes the guard above
    this.setLastEventTime(current, true);

    if (this.sessionId >= 0) {
      this.endSession(this.sessionId, endedAt);
    }
    this.setSessionId(current);
    this.trackSessionStart(current);
  }

  private trackSessionStart(sessionId: number) {
    void this.analytics?.track(AMP_SESSION_START_EVENT, undefined, (event) =>
      this.withSessionId(event, sessionId)
    );
  }

  private endSession(sessionId: number, endedAt: number) {
    void this.analytics?.track(AMP_SESSION_END_EVENT, undefined, (event) =>
      this.withSessionId(event, sessionId, endedAt)
    );
  }

  // Binds a snapshot of the id to one event, so it cannot drift before the event is enriched
  private withSessionId = (
    event: SegmentEvent,
    sessionId: number,
    // A backgrounded app cannot send, so session_end is dated to the last activity, not to delivery
    occurredAt?: number
  ): SegmentEvent => ({
    ...event,
    timestamp:
      occurredAt !== undefined && occurredAt > 0
        ? new Date(occurredAt).toISOString()
        : event.timestamp,
    integrations: {
      ...event.integrations,
      [this.key]: { session_id: sessionId },
    },
  });

  private insertSession = (event: SegmentEvent) => {
    if (this.hasSessionId(event)) {
      return event;
    }

    return {
      ...event,
      integrations: {
        ...(event.integrations ?? {}),
        [this.key]: { session_id: this.sessionId },
      },
    };
  };

  private hasSessionId(event: SegmentEvent) {
    const existing = event.integrations?.[this.key];
    return (
      typeof existing === 'object' &&
      existing !== null &&
      'session_id' in existing
    );
  }

  // Falls back to the current id if the enrichment closure was dropped by pre-init buffering
  private readSessionId(event: SegmentEvent) {
    const existing = event.integrations?.[this.key];
    if (this.hasSessionId(event)) {
      return (existing as { session_id: number }).session_id;
    }
    return this.sessionId;
  }

  private setSessionId(value: number) {
    this.sessionId = value;
    this.persist(SESSION_ID_KEY, value);
  }

  private setLastEventTime(value: number, force = false) {
    this.lastEventTime = value;
    // Throttled because this fires on every event; the comparison window is 5 minutes
    if (
      force ||
      value - this.lastPersistedEventTime >=
        LAST_EVENT_TIME_PERSIST_INTERVAL_IN_MS
    ) {
      this.lastPersistedEventTime = value;
      this.persist(LAST_EVENT_TIME_KEY, value);
    }
  }

  private persist(key: string, value: number) {
    AsyncStorage.setItem(key, value.toString()).catch((err) =>
      this.warn(`Failed to persist ${key}`, err)
    );
  }

  private warn(message: string, err: unknown) {
    this.analytics?.logger.warn(
      `[AmplitudeSessionPlugin] ${message}: ${String(err)}`
    );
  }

  // Mirrors Kotlin's disableCloudIntegrations: every other destination is dropped behind "All": false
  private disableCloudIntegrations(sessionId: number): SegmentAPIIntegrations {
    return {
      [ALL_INTEGRATIONS_KEY]: false,
      [this.key]: { session_id: sessionId },
    };
  }

  private onBackground = () => {
    this.setLastEventTime(Date.now(), true);
  };

  private onForeground = () => {
    this.startNewSessionIfNecessary();
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousAppState = this.appState;
    this.appState = nextAppState;

    if (nextAppState === 'active') {
      // Only a real return to the foreground, not iOS inactive/active churn
      if (previousAppState !== 'active') {
        this.onForeground();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      if (previousAppState === 'active' || previousAppState === 'unknown') {
        this.onBackground();
      }
    }
  };
}
