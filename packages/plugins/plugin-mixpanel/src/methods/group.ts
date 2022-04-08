import type { Mixpanel } from 'mixpanel-react-native';
import type {
  GroupEventType,
  SegmentMixpanelSettings,
} from '@segment/analytics-react-native';

export default (
  event: GroupEventType,
  mixpanel: Mixpanel,
  settings: SegmentMixpanelSettings
) => {
  const groupId = event.groupId;
  const groupTraits = settings.groupIdentifierTraits;

  if (groupId !== null && groupTraits?.length) {
    for (let groupTrait of groupTraits) {
      for (let eventTrait in event.traits) {
        if (groupTrait.toLocaleLowerCase() === eventTrait.toLocaleLowerCase()) {
          let group = event.traits[groupTrait] as string;
          let traits = event.traits;

          mixpanel.getGroup(group, groupId).setOnce('properties', traits);
        }
      }
      mixpanel.setGroup(groupTrait, groupId);
    }
  }
};
