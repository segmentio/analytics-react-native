import type { Mixpanel } from 'mixpanel-react-native';
import type { ScreenEventType, JsonMap } from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../types';

import track from './track';

export default (
  event: ScreenEventType,
  mixpanel: Mixpanel,
  settings: SegmentMixpanelSettings
) => {
  const callTrack = (eventName: string, properties: JsonMap) => {
    track(eventName, properties, settings, mixpanel);
  };
  const properties = event.properties;

  if (settings.consolidatedPageCalls === true) {
    let eventName = 'Loaded a Screen';
    let name = event.name;

    if (name !== undefined) {
      properties[name] = name;
    }

    callTrack(eventName, properties);
  } else if (settings.trackAllPages === true) {
    let eventName = `Viewed ${event.name} Screen`;

    callTrack(eventName, properties);
  } else if (settings.trackNamedPages === true && event.name !== undefined) {
    let eventName = `Viewed ${event.name} Screen`;

    callTrack(eventName, properties);
  } else if (
    settings.trackCategorizedPages === true &&
    event.properties?.category !== undefined
  ) {
    let category = event.properties.category;
    let eventName = `Viewed ${category} Screen`;

    callTrack(eventName, properties);
  }
};
