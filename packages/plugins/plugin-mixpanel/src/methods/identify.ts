import type { Mixpanel } from 'mixpanel-react-native';
import {
  IdentifyEventType,
  generateMapTransform,
} from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../types';

const traitMap: { [key: string]: string } = {
  firstName: '$first_name',
  lastName: '$last_name',
  createdAt: '$created',
  lastSeen: '$last_seen',
  email: '$email',
  name: '$name',
  username: '$username',
  phone: '$phone',
} as any;

const mapTransform = generateMapTransform(traitMap, {});

export default (
  event: IdentifyEventType,
  mixpanel: Mixpanel,
  settings: SegmentMixpanelSettings
) => {
  const userId = event.userId;
  const mixpanelTraits = mapTransform(event.traits);

  if (userId !== undefined) {
    mixpanel.identify(userId);
  }

  if (settings.setAllTraitsByDefault === true) {
    mixpanel.registerSuperProperties(mixpanelTraits);

    if (settings.people === true) {
      mixpanel.getPeople().set(mixpanelTraits);
    }
  }

  if (
    settings.superProperties !== undefined &&
    settings.superProperties.length
  ) {
    let superProperties = settings.superProperties;
    let superPropertyTraits: { [key: string]: any } = {};

    for (let superProperty of superProperties) {
      superPropertyTraits[superProperty] = mixpanelTraits[superProperty];
    }

    const mappedSuperProperties = mapTransform(superPropertyTraits);
    mixpanel.registerSuperProperties(mappedSuperProperties);
  }

  if (
    settings.people === true &&
    settings.peopleProperties !== undefined &&
    settings.peopleProperties.length
  ) {
    let peopleProperties = settings.peopleProperties;
    let peoplePropertyTraits: { [key: string]: any } = {};

    for (let peopleProperty of peopleProperties) {
      peoplePropertyTraits[peopleProperty] = event.traits[peopleProperty];
    }

    const mappedPeopleProperties = mapTransform(peoplePropertyTraits);
    mixpanel.getPeople().set(mappedPeopleProperties);
  }
};
