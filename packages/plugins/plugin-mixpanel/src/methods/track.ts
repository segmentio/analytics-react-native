import type { Mixpanel } from 'mixpanel-react-native';
//@ts-ignore
import type { JsonMap } from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../types';

export default (
  eventName: string,
  properties: JsonMap,
  settings: SegmentMixpanelSettings,
  mixpanel: Mixpanel
) => {
  //track raw event
  mixpanel.track(eventName, properties);

  //everything else is for people setting
  if (settings.people !== true) {
    return;
  }

  if (
    settings.propIncrements !== undefined &&
    settings.propIncrements?.length > 0
  ) {
    let propIncrements = settings.propIncrements;

    for (let propString of propIncrements) {
      for (let property in properties) {
        if (propString.toLowerCase() === property.toLowerCase()) {
          let incrementValue = properties[property];
          if (typeof incrementValue === 'number') {
            mixpanel.getPeople().increment(property, incrementValue);
          }
        }
      }
    }
  }

  if (
    settings.eventIncrements !== undefined &&
    settings.eventIncrements.length > 0
  ) {
    const eventIncrements = settings.eventIncrements;

    for (let eventString of eventIncrements) {
      if (eventString.toLowerCase() === eventName.toLowerCase()) {
        const property = eventName;
        mixpanel.getPeople().increment(property, 1);

        const lastEvent = `Last ${property}`;
        const lastDate = Date();
        mixpanel.getPeople().set(lastEvent, lastDate);
      }
    }
  }

  if (properties.revenue !== undefined) {
    let revenue = properties.revenue as number;

    mixpanel.getPeople().trackCharge(revenue, properties);
  }
};
