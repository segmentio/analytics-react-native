import { Adjust } from 'react-native-adjust';
import type { IdentifyEventType } from '@segment/analytics-react-native';

export default (event: IdentifyEventType) => {
  const userId = event.userId;
  if (userId && userId.length > 0) {
    Adjust.addSessionPartnerParameter('user_id', userId);
  }

  const anonId = event.anonymousId;
  if (anonId && anonId.length > 0) {
    Adjust.addSessionPartnerParameter('anonymous_id', anonId);
  }
};
