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

export class AmplitudeSessionPlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Actions Amplitude';
  active = false;
  sessionId = Date.now();
  sessionTimer = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    let integrations = settings.integrations;
    if (this.key in integrations) {
      this.active = true;
      this.startSession();
    }
  }

  execute(event: SegmentEvent) {
    if (!this.active) {
      return event;
    }

    this.handleTimer();

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

  private resetTimer = () => {
    this.sessionTimer = false;
    this.sessionId = -1;
  };

  private startSession = () => {
    const maxSessionTime = 300000;

    setTimeout(() => this.resetTimer(), maxSessionTime);
    this.sessionId = Date.now();
    this.sessionTimer = true;
  };

  private handleTimer = () => {
    if (!this.sessionTimer) {
      this.startSession();
    }
    return;
  };
}
