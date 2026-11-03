import appsFlyer from 'react-native-appsflyer';
import {
  IdentifyEventType,
  unknownToString,
} from '@segment/analytics-react-native';

export default (event: IdentifyEventType) => {
  const userId = event.userId;
  if (userId !== undefined && userId !== null && userId.length > 0) {
    void appsFlyer.setCustomerUserId({ customerId: userId });
  }

  const traits = event.traits;
  if (traits !== undefined && traits !== null) {
    const aFTraits: {
      email?: string;
      firstName?: string;
      lastName?: string;
    } = {};

    if (traits.email !== undefined && traits.email !== null) {
      aFTraits.email = traits.email;
    }

    if (traits.firstName !== undefined && traits.firstName !== null) {
      aFTraits.firstName = traits.firstName;
    }

    if (traits.lastName !== undefined && traits.firstName !== null) {
      aFTraits.lastName = traits.lastName;
    }

    if (traits.currencyCode !== undefined && traits.currencyCode !== null) {
      const codeString = unknownToString(traits.currencyCode);
      if (codeString !== undefined) {
        void appsFlyer.setCurrencyCode({ currencyCode: codeString });
      }
    }

    void appsFlyer.setAdditionalData({ customData: aFTraits });
  }
};
