import type { Mixpanel } from 'mixpanel-react-native';
import type { GroupEventType } from '@segment/analytics-react-native';
import type { SegmentMixpanelSettings } from '../types';

export default (
  event: GroupEventType,
  mixpanel: Mixpanel,
  settings: SegmentMixpanelSettings
) => {
  const groupId = event.groupId;
  const groupTraits = settings.groupIdentifierTraits;

  if (groupTraits !== undefined) {
    for (let groupTrait of groupTraits) {
      for (let eventTrait in event.traits) {
        if (groupTrait.toLocaleLowerCase() === eventTrait.toLocaleLowerCase()) {
          const group = event.traits[groupTrait] as string;
          const traits = event.traits;

          mixpanel.getGroup(group, groupId).setOnce('properties', traits);
        }
      }
      mixpanel.setGroup(groupTrait, groupId);
    }
  }
};
