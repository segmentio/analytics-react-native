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
  const properties = event.properties;

  if (settings.consolidatedPageCalls === true) {
    let eventName = 'Loaded a Screen';
    let name = event.name;

    if (name !== undefined) {
      properties[name] = name;
    }

    callMixpanelTrack(eventName, properties);
  } else if (settings.trackAllPages === true) {
    let eventName = `Viewed ${event.name} Screen`;

    callMixpanelTrack(eventName, properties);
  } else if (settings.trackNamedPages === true && event.name !== undefined) {
    let eventName = `Viewed ${event.name} Screen`;

    callMixpanelTrack(eventName, properties);
  } else if (
    settings.trackCategorizedPages === true &&
    event.properties?.category !== undefined
  ) {
    let category = event.properties.category;
    let eventName = `Viewed ${category} Screen`;

    callMixpanelTrack(eventName, properties);
  }
};
