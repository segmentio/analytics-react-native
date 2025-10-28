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
} from '@segment/analytics-react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const MAX_SESSION_TIME_IN_MS = 300000;
const SESSION_ID_KEY = 'previous_session_id';
const LAST_EVENT_TIME_KEY = 'last_event_time';
const AMP_SESSION_START_EVENT = 'session_start';
const AMP_SESSION_END_EVENT = 'session_end';

export class AmplitudeSessionPlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Actions Amplitude';
  active = false;
  sessionId = -1;
  lastEventTime = -1;
  eventSessionId = -1;
  resetPending = false;

  configure = async (analytics: SegmentClient): Promise<void> => {
    this.analytics = analytics;
    await this.loadSessionData();
    AppState.addEventListener('change', this.handleAppStateChange);
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

    if (this.sessionId === -1 || this.lastEventTime === -1) {
      await this.loadSessionData();
    }
    await this.startNewSessionIfNecessary();
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

    this.lastEventTime = Date.now();
    await this.saveSessionData();
    return result;
  }

  identify(event: IdentifyEventType) {
    return this.insertSession(event) as IdentifyEventType;
  }

  track(event: TrackEventType) {
    const eventName = event.event;

    if (eventName === AMP_SESSION_START_EVENT) {
      this.resetPending = false;
      this.eventSessionId = this.sessionId;
    }

    if (eventName === AMP_SESSION_END_EVENT) {
      console.log(`[AmplitudeSession] EndSession = ${this.eventSessionId}`);
    }

    if (
      eventName.startsWith('Amplitude') ||
      eventName === AMP_SESSION_START_EVENT ||
      eventName === AMP_SESSION_END_EVENT
    ) {
      const integrations = this.disableAllIntegrations(event.integrations);
      return {
        ...event,
        integrations: {
          ...integrations,
          [this.key]: { session_id: this.eventSessionId },
        },
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
    this.sessionId = -1;
    this.lastEventTime = -1;
    await AsyncStorage.removeItem(SESSION_ID_KEY);
    await AsyncStorage.removeItem(LAST_EVENT_TIME_KEY);
  }

  private insertSession = (event: SegmentEvent) => {
    const integrations = event.integrations || {};
    const existingIntegration = integrations[this.key];
    const hasSessionId =
      typeof existingIntegration === 'object' &&
      existingIntegration !== null &&
      'session_id' in existingIntegration;

    if (hasSessionId) {
      return event;
    }

    return {
      ...event,
      integrations: {
        ...integrations,
        [this.key]: { session_id: this.sessionId },
      },
    };
  };

  private onBackground = () => {
    this.lastEventTime = Date.now();
    this.saveSessionData();
  };

  private onForeground = () => {
    this.startNewSessionIfNecessary();
  };

  private async startNewSessionIfNecessary() {
    if (this.eventSessionId === -1) {
      this.eventSessionId = this.sessionId;
    }

    if (this.resetPending) {
      return;
    }

    const current = Date.now();
    const withinSessionLimit = this.withinMinSessionTime(current);

    const isSessionExpired =
      this.sessionId === -1 || this.lastEventTime === -1 || !withinSessionLimit;

    if (this.sessionId >= 0 && !isSessionExpired) {
      // Continue current session
      this.lastEventTime = current;

      await this.saveSessionData();
      return;
    }

    // End old session and start a new one
    await this.startNewSession();
  }

  /**
   * Handles the entire process of starting a new session.
   * Can be called directly or from startNewSessionIfNecessary()
   */
  private async startNewSession() {
    if (this.resetPending) {
      return;
    }

    this.resetPending = true;

    const oldSessionId = this.sessionId;
    if (oldSessionId >= 0) {
      await this.endSession(oldSessionId);
    }

    const newSessionId = Date.now();
    this.sessionId = newSessionId;
    this.eventSessionId =
      this.eventSessionId === -1 ? newSessionId : this.eventSessionId;
    this.lastEventTime = newSessionId;

    await this.saveSessionData();

    console.log(`[AmplitudeSession] startNewSession -> ${newSessionId}`);

    await this.trackSessionStart(newSessionId);
  }

  /**
   * Extracted analytics tracking into its own method
   */
  private async trackSessionStart(sessionId: number) {
    this.analytics?.track(AMP_SESSION_START_EVENT, {
      integrations: {
        [this.key]: { session_id: sessionId },
      },
    });
  }

  private async endSession(sessionId: number) {
    if (this.sessionId === -1) {
      return;
    }

    console.log(`[AmplitudeSession] endSession -> ${this.sessionId}`);

    this.analytics?.track(AMP_SESSION_END_EVENT, {
      integrations: {
        [this.key]: { session_id: sessionId },
      },
    });
  }

  private async loadSessionData() {
    const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    const storedLastEventTime = await AsyncStorage.getItem(LAST_EVENT_TIME_KEY);
    this.sessionId = storedSessionId != null ? Number(storedSessionId) : -1;
    this.lastEventTime =
      storedLastEventTime != null ? Number(storedLastEventTime) : -1;
  }

  private async saveSessionData() {
    await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId.toString());
    await AsyncStorage.setItem(
      LAST_EVENT_TIME_KEY,
      this.lastEventTime.toString()
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private disableAllIntegrations(integrations?: Record<string, any>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    if (!integrations) {
      return result;
    }
    for (const key of Object.keys(integrations)) {
      result[key] = false;
    }
    return result;
  }

  private withinMinSessionTime(timestamp: number): boolean {
    const timeDelta = timestamp - this.lastEventTime;
    return timeDelta < MAX_SESSION_TIME_IN_MS;
  }

  private handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      this.onForeground();
    } else if (nextAppState === 'background') {
      this.onBackground();
    }
  };
}
