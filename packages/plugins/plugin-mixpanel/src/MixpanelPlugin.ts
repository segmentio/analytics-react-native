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

export const EU_SERVER = 'api.eu.mixpanel.com';
export class MixpanelPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Mixpanel';
  trackScreens = false;
  private mixpanel: Mixpanel | undefined;
  private settings: SegmentMixpanelSettings | undefined = undefined;

  update(settings: SegmentAPISettings, _: UpdateType) {
    const mixpanelSettings = settings.integrations[
      this.key
    ] as SegmentMixpanelSettings;

    if (mixpanelSettings === undefined || this.mixpanel !== undefined) {
      return;
    }
    if (mixpanelSettings.token.length > 0) {
      this.mixpanel = new Mixpanel(mixpanelSettings.token);
      this.mixpanel.init();
      this.settings = mixpanelSettings;
    } else {
      return;
    }

    if (mixpanelSettings.enableEuropeanEndpoint) {
      this.mixpanel?.setServerURL(EU_SERVER);
    }
  }

  identify(event: IdentifyEventType) {
    if (this.mixpanel !== undefined && this.settings !== undefined) {
      identify(event, this.mixpanel, this.settings);
    }
    return event;
  }

  track(event: TrackEventType) {
    const eventName = event.event;
    const properties = event.properties as JsonMap;

    if (this.mixpanel !== undefined && this.settings !== undefined) {
      mixpanelTrack(eventName, properties, this.settings, this.mixpanel);
    }
    return event;
  }

  screen(event: ScreenEventType) {
    if (this.mixpanel !== undefined && this.settings !== undefined) {
      screen(event, this.mixpanel, this.settings);
    }
    return event;
  }

  group(event: GroupEventType) {
    if (this.mixpanel !== undefined && this.settings !== undefined) {
      group(event, this.mixpanel, this.settings);
    }
    return event;
  }

  alias(event: AliasEventType) {
    if (this.mixpanel !== undefined) {
      alias(event, this.mixpanel);
    }
    return event;
  }

  flush(): void {
    this.mixpanel?.flush();
  }
}
