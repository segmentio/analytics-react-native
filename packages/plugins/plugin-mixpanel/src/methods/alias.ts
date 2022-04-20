import type { Mixpanel } from 'mixpanel-react-native';
import type { AliasEventType } from '@segment/analytics-react-native';

export default async (event: AliasEventType, mixpanel: Mixpanel) => {
  let distinctId = '';
  let newId = event.userId as string;

  try {
    distinctId = await mixpanel.getDistinctId();
  } catch (e) {
    console.log(e);
  }
  if (distinctId !== '') {
    mixpanel.alias(newId, distinctId);
  }
};
