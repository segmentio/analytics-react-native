import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  SegmentAPISettings,
  UpdateType,
  SegmentMixpanelSettings,
  IdentifyEventType,
  GroupEventType,
  JsonMap,
  AliasEventType,
} from '@segment/analytics-react-native';
import { Mixpanel } from 'mixpanel-react-native';
import identify from './methods/identify';
import screen from './methods/screen';
import group from './methods/group';
import alias from './methods/alias';
import mixpanelTrack from './methods/mixpanelTrack';

export class MixpanelPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Mixpanel';
  trackScreens = false;
  private mixpanel: Mixpanel | undefined;
  private settings: SegmentMixpanelSettings | null = null;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const mixpanelSettings = settings.integrations[
      this.key
    ] as SegmentMixpanelSettings;

    if (!mixpanelSettings || this.mixpanel !== undefined) {
      return;
    }
    if (mixpanelSettings.token.length) {
      this.mixpanel = new Mixpanel(mixpanelSettings.token);
      this.mixpanel.init();
      this.settings = mixpanelSettings;
    } else {
      return;
    }

    if (mixpanelSettings.enableEuropeanEndpoint) {
      this.mixpanel?.setServerURL('api.eu.mixpanel.com');
    }
  }

  identify(event: IdentifyEventType) {
    identify(event, this.mixpanel!, this.settings!);
    return event;
  }

  track(event: TrackEventType) {
    const eventName = event.event;
    const properties = event.properties as JsonMap;

    mixpanelTrack(eventName, properties, this.settings!, this.mixpanel!);
    return event;
  }

  screen(event: ScreenEventType) {
    screen(event, this.mixpanel!, this.settings!);
    return event;
  }

  group(event: GroupEventType) {
    group(event, this.mixpanel!, this.settings!);
    return event;
  }

  alias(event: AliasEventType) {
    alias(event, this.mixpanel!);
    return event;
  }
}
