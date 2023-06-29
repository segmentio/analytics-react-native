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
} from '@segment/analytics-react-native';

const MAX_SESSION_TIME_IN_MS = 300000;
export class AmplitudeSessionPlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Actions Amplitude';
  active = false;
  sessionId: number | undefined;
  sessionTimer: ReturnType<typeof setTimeout> | undefined;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const integrations = settings.integrations;
    if (this.key in integrations) {
      this.active = true;
      this.refreshSession();
    }
  }

  execute(event: SegmentEvent) {
    if (!this.active) {
      return event;
    }

    this.refreshSession();

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

  private insertSession = (event: SegmentEvent) => {
    const returnEvent = event;
    const integrations = event.integrations;
    returnEvent.integrations = {
      ...integrations,
      [this.key]: {
        session_id: this.sessionId,
      },
    };
    return returnEvent;
  };

  private resetSession = () => {
    this.sessionId = Date.now();
    this.sessionTimer = undefined;
  };

  private refreshSession = () => {
    if (this.sessionId === undefined) {
      this.sessionId = Date.now();
    }

    if (this.sessionTimer !== undefined) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(
      () => this.resetSession(),
      MAX_SESSION_TIME_IN_MS
    );
  };
}
