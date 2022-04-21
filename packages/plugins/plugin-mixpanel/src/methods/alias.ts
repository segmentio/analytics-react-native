import type { Mixpanel } from 'mixpanel-react-native';
import type { AliasEventType } from '@segment/analytics-react-native';
import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';

export default async (
  event: AliasEventType,
  mixpanel: Mixpanel,
  analytics: SegmentClient
) => {
  let distinctId = '';
  const newId = event.userId as string;

  try {
    distinctId = await mixpanel.getDistinctId();
  } catch (e) {
    analytics.logger.warn(e);
  }
  if (distinctId !== '') {
    mixpanel.alias(newId, distinctId);
  }
};
