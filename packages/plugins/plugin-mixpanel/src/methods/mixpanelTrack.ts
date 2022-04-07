import type { Mixpanel } from 'mixpanel-react-native';
import type {
  SegmentMixpanelSettings,
  JsonMap,
} from '@segment/analytics-react-native';

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

  if (settings.propIncrements?.length) {
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

  if (settings.eventIncrements?.length) {
    let eventIncrements = settings.eventIncrements;

    for (let eventString of eventIncrements) {
      if (eventString.toLowerCase() === eventName.toLowerCase()) {
        let property = eventName;
        mixpanel.getPeople().increment(property, 1);

        let lastEvent = `Last ${property}`;
        let lastDate = Date();
        mixpanel.getPeople().set(lastEvent, lastDate);
      }
    }
  }

  if (properties.revenue) {
    let revenue = properties.revenue as number;

    mixpanel.getPeople().trackCharge(revenue, properties);
  }
};
