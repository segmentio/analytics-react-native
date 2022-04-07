import type { Mixpanel } from 'mixpanel-react-native';
import type {
  ScreenEventType,
  SegmentMixpanelSettings,
  JsonMap,
} from '@segment/analytics-react-native';

import mixpanelTrack from './mixpanelTrack';

export default (
  event: ScreenEventType,
  mixpanel: Mixpanel,
  settings: SegmentMixpanelSettings
) => {
  const callMixpanelTrack = (eventName: string, properties: JsonMap) => {
    mixpanelTrack(eventName, properties, settings, mixpanel);
  };

  if (settings.consolidatedPageCalls === true) {
    let eventName = 'Loaded a Screen';
    let name = event.name;
    let properties = event.properties;

    if (name !== undefined) {
      properties[name] = name;
    }

    callMixpanelTrack(eventName, properties);
  } else if (settings.trackAllPages === true) {
    let eventName = ` Viewed ${event.name} Screen`;
    let properties = event.properties;

    callMixpanelTrack(eventName, properties);
  } else if (settings.trackNamedPages === true) {
    let name = event.name;

    if (name !== undefined) {
      let eventName = `Viewed ${name} Screen`;
      let properties = event.properties;

      callMixpanelTrack(eventName, properties);
    }
  } else if (settings.trackCategorizedPages === true) {
    let category = event.properties.category ?? undefined;

    if (category !== undefined) {
      let eventName = `Viewed ${category} Screen`;
      let properties = event.properties;

      callMixpanelTrack(eventName, properties);
    }
  }
};
