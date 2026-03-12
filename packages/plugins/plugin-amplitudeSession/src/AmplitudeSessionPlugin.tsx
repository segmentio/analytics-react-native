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
  private _sessionId = -1;
  private _lastEventTime = -1;
  private _previousAppState: string = AppState.currentState ?? 'unknown';
  private _sessionTransition: Promise<void> | null = null;

  get lastEventTime() {
    return this._lastEventTime;
  }
  set lastEventTime(value: number) {
    this._lastEventTime = value;
    if (value !== -1) {
      AsyncStorage.setItem(LAST_EVENT_TIME_KEY, value.toString()).catch((err) =>
        console.warn(
          '[AmplitudeSessionPlugin] Failed to persist lastEventTime:',
          err
        )
      );
    }
  }

  get sessionId() {
    return this._sessionId;
  }
  set sessionId(value: number) {
    this._sessionId = value;
  }

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

    if (this._sessionId === -1 || this._lastEventTime === -1) {
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
    return result;
  }

  identify(event: IdentifyEventType) {
    return this.insertSession(event) as IdentifyEventType;
  }

  track(event: TrackEventType) {
    const eventName = event.event;

    if (
      eventName.startsWith('Amplitude') ||
      eventName === AMP_SESSION_START_EVENT ||
      eventName === AMP_SESSION_END_EVENT
    ) {
      const integrations = this.disableAllIntegrations(event.integrations);
      const ampIntegration = event.integrations?.[this.key];
      const existingSessionId =
        ampIntegration !== undefined &&
        typeof ampIntegration === 'object' &&
        ampIntegration !== null &&
        'session_id' in ampIntegration
          ? (ampIntegration as { session_id: number }).session_id
          : this._sessionId;
      return {
        ...event,
        integrations: {
          ...integrations,
          [this.key]: { session_id: existingSessionId },
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
    const oldSessionId = this._sessionId;
    if (oldSessionId >= 0) {
      this.analytics?.track(AMP_SESSION_END_EVENT, {
        integrations: { [this.key]: { session_id: oldSessionId } },
      });
    }
    this._sessionId = -1;
    this._lastEventTime = -1;
    await AsyncStorage.multiRemove([SESSION_ID_KEY, LAST_EVENT_TIME_KEY]);
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
        [this.key]: { session_id: this._sessionId },
      },
    };
  };

  private onBackground = () => {
    this.lastEventTime = Date.now();
  };

  private onForeground = async () => {
    await this.startNewSessionIfNecessary();
  };

  private async startNewSessionIfNecessary() {
    if (this._sessionTransition !== null) {
      await this._sessionTransition;
      return;
    }

    const isExpired =
      this._sessionId === -1 ||
      this._lastEventTime === -1 ||
      !this.withinMinSessionTime(Date.now());

    if (!isExpired) {
      return;
    }

    this._sessionTransition = this.performSessionTransition().finally(() => {
      this._sessionTransition = null;
    });
    await this._sessionTransition;
  }

  private async performSessionTransition() {
    const oldSessionId = this._sessionId;
    if (oldSessionId >= 0) {
      this.analytics?.track(AMP_SESSION_END_EVENT, {
        integrations: { [this.key]: { session_id: oldSessionId } },
      });
    }

    const newSessionId = Date.now();
    this._sessionId = newSessionId;
    this._lastEventTime = newSessionId;

    await AsyncStorage.multiSet([
      [SESSION_ID_KEY, newSessionId.toString()],
      [LAST_EVENT_TIME_KEY, newSessionId.toString()],
    ]);

    this.analytics?.track(AMP_SESSION_START_EVENT, {
      integrations: { [this.key]: { session_id: newSessionId } },
    });
  }

  private async loadSessionData() {
    const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    const storedLastEventTime = await AsyncStorage.getItem(LAST_EVENT_TIME_KEY);

    this._sessionId = storedSessionId != null ? Number(storedSessionId) : -1;
    this._lastEventTime =
      storedLastEventTime != null ? Number(storedLastEventTime) : -1;
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
    const timeDelta = timestamp - this._lastEventTime;
    return timeDelta < MAX_SESSION_TIME_IN_MS;
  }

  private handleAppStateChange = (nextAppState: string) => {
    if (
      ['inactive', 'background'].includes(this._previousAppState) &&
      nextAppState === 'active'
    ) {
      this.onForeground();
    } else if (
      this._previousAppState === 'active' &&
      ['inactive', 'background'].includes(nextAppState)
    ) {
      this.onBackground();
    }
    this._previousAppState = nextAppState;
  };
}
