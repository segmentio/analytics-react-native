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
//import { AppState } from 'react-native';

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
  sessionTimer: ReturnType<typeof setTimeout> | undefined;

  configure(analytics: SegmentClient): void {
    this.analytics = analytics;
    AppState.addEventListener('change', this.handleAppStateChange);
    this.loadSessionData();
    if (this.sessionId === -1) {
      this.startNewSession();
    } else {
      this.startNewSessionIfNecessary();
    }
  }

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
    await this.startNewSessionIfNecessary();

    let result = event;
    if (result.type === EventType.TrackEvent) {
      console.log(result.event);
    }

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

  reset() {
    //this.resetSession();
  }

  private insertSession = (event: SegmentEvent) => {
    const returnEvent = event;
    const integrations = event.integrations || {};
    const existingIntegration = integrations[this.key];
    const hasSessionId =
      typeof existingIntegration === 'object' &&
      existingIntegration !== null &&
      'session_id' in existingIntegration;

    // If session_id exists, return as is
    if (hasSessionId) {
      return returnEvent;
    }

    returnEvent.integrations = {
      ...integrations,
      [this.key]: {
        session_id: this.sessionId,
      },
    };
    return returnEvent;
  };

  private onBackground() {
    this.lastEventTime = Date.now();

    this.saveSessionData();
  }

  private onForeground() {
    this.startNewSessionIfNecessary();
  }

  private async startNewSessionIfNecessary() {
    const current = Date.now();
    const withinSessionLimit =
      current - this.lastEventTime < MAX_SESSION_TIME_IN_MS;
    if (this.sessionId >= 0 && withinSessionLimit) {
      return;
    }
    this.lastEventTime = current;
    await this.endSession();
    await this.startNewSession();
  }

  private async startNewSession() {
    this.sessionId = Date.now();
    const copy = this.sessionId;
    if (this.analytics) {
      this.analytics.track(AMP_SESSION_START_EVENT, {
        integrations: {
          [this.key]: { session_id: copy },
        },
      });
    }
    await this.saveSessionData();
  }

  private async endSession() {
    const copy = this.sessionId;
    if (this.analytics) {
      this.analytics.track(AMP_SESSION_END_EVENT, {
        integrations: {
          [this.key]: { session_id: copy },
        },
      });
    }
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

  private handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      this.onForeground();
    } else if (nextAppState === 'background') {
      this.onBackground();
    }
  };
}
