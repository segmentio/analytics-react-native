import appsFlyer from 'react-native-appsflyer';
import type { IdentifyEventType } from '@segment/analytics-react-native';

export default (event: IdentifyEventType) => {
  const userId = event.userId;
  if (userId && userId.length > 0) {
    appsFlyer.setCustomerUserId(userId);
  }

  const traits = event.traits;
  if (traits) {
    const aFTraits: {
      email?: string;
      firstName?: string;
      lastName?: string;
    } = {};

    if (traits.email) {
      aFTraits.email = traits.email;
    }

    if (traits.firstName) {
      aFTraits.firstName = traits.firstName;
    }

    if (traits.lastName) {
      aFTraits.lastName = traits.lastName;
    }

    if (traits.currencyCode) {
      appsFlyer.setCurrencyCode(String(traits.currencyCode));
    }

    appsFlyer.setAdditionalData(aFTraits);
  }
};
