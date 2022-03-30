import type { IdentifyEventType } from '@segment/analytics-react-native';
import * as Taplytics from 'taplytics-react-native';

export default (event: IdentifyEventType) => {
  const userAttributes = {
    user_id: event.userId,
    email: event.traits?.email,
    name: event.traits?.name,
    age: event.traits?.age,
    gender: event.traits?.gender,
  };

  const cleanedUserAttributes = JSON.parse(JSON.stringify(userAttributes));

  Taplytics.setUserAttributes(cleanedUserAttributes);
  return event;
};
