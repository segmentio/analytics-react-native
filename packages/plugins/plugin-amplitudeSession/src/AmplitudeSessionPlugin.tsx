// import {
//   EventPlugin,
//   EventType,
//   IdentifyEventType,
//   PluginType,
//   SegmentAPISettings,
//   SegmentEvent,
//   TrackEventType,
//   ScreenEventType,
//   GroupEventType,
//   UpdateType,
//   AliasEventType,
//   SegmentClient,
// } from '@segment/analytics-react-native';

// const MAX_SESSION_TIME_IN_MS = 300000;
// export class AmplitudeSessionPlugin extends EventPlugin {
//   type = PluginType.enrichment;
//   key = 'Actions Amplitude';
//   active = false;
//   sessionId: number | undefined;
//   sessionTimer: ReturnType<typeof setTimeout> | undefined;

//   configure(_analytics: SegmentClient): void {
//     this.analytics = _analytics;
//   }

//   update(settings: SegmentAPISettings, _: UpdateType) {
//     const integrations = settings.integrations;
//     if (this.key in integrations) {
//       this.active = true;
//       this.refreshSession();
//     }
//   }

//   execute(event: SegmentEvent) {
//     if (!this.active) {
//       return event;
//     }

//     this.refreshSession();

//     let result = event;
//     switch (result.type) {
//       case EventType.IdentifyEvent:
//         result = this.identify(result);
//         break;
//       case EventType.TrackEvent:
//         result = this.track(result);
//         break;
//       case EventType.ScreenEvent:
//         result = this.screen(result);
//         break;
//       case EventType.AliasEvent:
//         result = this.alias(result);
//         break;
//       case EventType.GroupEvent:
//         result = this.group(result);
//         break;
//     }
//     return result;
//   }

//   identify(event: IdentifyEventType) {
//     return this.insertSession(event) as IdentifyEventType;
//   }

//   track(event: TrackEventType) {
//     return this.insertSession(event) as TrackEventType;
//   }

//   screen(event: ScreenEventType) {
//     return this.insertSession(event) as ScreenEventType;
//   }

//   group(event: GroupEventType) {
//     return this.insertSession(event) as GroupEventType;
//   }

//   alias(event: AliasEventType) {
//     return this.insertSession(event) as AliasEventType;
//   }

//   reset() {
//     this.resetSession();
//   }

//   private insertSession = (event: SegmentEvent) => {
//     const returnEvent = event;
//     const integrations = event.integrations;
//     returnEvent.integrations = {
//       ...integrations,
//       [this.key]: {
//         session_id: this.sessionId,
//       },
//     };
//     return returnEvent;
//   };

//   private resetSession = () => {
//     this.sessionId = Date.now();
//     this.sessionTimer = undefined;
//   };

//   private refreshSession = () => {
//     if (this.sessionId === undefined) {
//       this.sessionId = Date.now();
//     }

//     if (this.sessionTimer !== undefined) {
//       clearTimeout(this.sessionTimer);
//     }

//     this.sessionTimer = setTimeout(
//       () => this.resetSession(),
//       MAX_SESSION_TIME_IN_MS
//     );
//   };
// }

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
const SESSION_ID_KEY = 'amplitude_session_id';
const LAST_EVENT_TIME_KEY = 'amplitude_last_event_time';

export class AmplitudeSessionPlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Actions Amplitude';
  active = false;
  sessionId: number | undefined;
  lastEventTime: number | undefined;
  sessionTimer: ReturnType<typeof setTimeout> | undefined;

  configure(_analytics: SegmentClient): void {
    this.analytics = _analytics;
    AppState.addEventListener('change', this.handleAppStateChange);
    this.loadSessionData();
  }

  // Called when plugin is initialized with Segment settings
  update(settings: SegmentAPISettings, _: UpdateType) {
    const integrations = settings.integrations;
    if (this.key in integrations) {
      this.active = true;
      this.refreshSession();
    }
  }

  // Core event processing hook
  async execute(event: SegmentEvent) {
    if (!this.active) {
      return event;
    }

    await this.refreshSession();

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
    return result;
  }

  identify(event: IdentifyEventType) {
    return this.insertSession(event) as IdentifyEventType;
  }

  track(event: TrackEventType) {
    return this.insertSession(event) as TrackEventType;
  }

  screen(event: ScreenEventType) {
    return this.insertSession(event) as ScreenEventType;
  }

  group(event: GroupEventType) {
    return this.insertSession(event) as GroupEventType;
  }

  alias(event: AliasEventType) {
    return this.insertSession(event) as AliasEventType;
  }

  reset() {
    this.resetSession();
  }

  // Injects session_id into event's integrations
  private insertSession = (event: SegmentEvent) => {
    const returnEvent = event;
    returnEvent.integrations = {
      ...event.integrations,
      [this.key]: {
        session_id: this.sessionId,
      },
    };
    return returnEvent;
  };

  // Emits session start/end events manually (optional for debugging or analytics)
  private trackSessionEvent = (eventName: string) => {
    if (this.analytics && this.sessionId != null) {
      this.analytics.track(eventName, {
        integrations: {
          [this.key]: {
            session_id: this.sessionId,
          },
        },
      });
    }
  };

  // Creates new session and tracks it
  private resetSession = async () => {
    this.trackSessionEvent('session_end');
    this.sessionId = Date.now();
    this.lastEventTime = this.sessionId;
    this.trackSessionEvent('session_start');
    this.sessionTimer = undefined;
    await this.saveSessionData();
  };

  // Refreshes session only if session timeout occurred
  private refreshSession = async () => {
    const now = Date.now();
    console.log('sessionId', this.sessionId);
    console.log('this.lastEventTime', this.lastEventTime);
    if (this.lastEventTime != null) {
      console.log(
        'now - this.lastEventTime > MAX_SESSION_TIME_IN_MS',
        now - this.lastEventTime > MAX_SESSION_TIME_IN_MS
      );
    }
    if (
      this.sessionId === undefined ||
      this.lastEventTime === undefined ||
      now - this.lastEventTime > MAX_SESSION_TIME_IN_MS
    ) {
      console.log(' await this.resetSession()');
      await this.resetSession();
    } else {
      this.lastEventTime = now;
      console.log(' await this.saveSessionData()');
      await this.saveSessionData();
    }

    if (this.sessionTimer !== undefined) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(
      () => this.resetSession(),
      MAX_SESSION_TIME_IN_MS
    );
  };

  // Loads stored session state from persistent storage
  private async loadSessionData() {
    const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    const storedLastEventTime = await AsyncStorage.getItem(LAST_EVENT_TIME_KEY);
    this.sessionId =
      storedSessionId != null ? Number(storedSessionId) : undefined;
    this.lastEventTime =
      storedLastEventTime != null ? Number(storedLastEventTime) : undefined;
  }

  // Persists session state
  private async saveSessionData() {
    if (this.sessionId !== undefined) {
      await AsyncStorage.setItem(SESSION_ID_KEY, this.sessionId.toString());
      await AsyncStorage.setItem(LAST_EVENT_TIME_KEY, Date.now().toString());
    }
  }

  // Handles app going to foreground/background
  private handleAppStateChange = (nextAppState: string) => {
    console.log('nextAppState', nextAppState);
    if (nextAppState === 'active') {
      this.refreshSession();
    } else if (nextAppState === 'background') {
      this.saveSessionData();
    }
  };
}
