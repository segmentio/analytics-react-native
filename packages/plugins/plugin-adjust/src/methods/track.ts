import { Adjust, AdjustEvent } from 'react-native-adjust';
import type {
  TrackEventType,
  SegmentAdjustSettings,
} from '@segment/analytics-react-native';
import { extract, mappedCustomEventToken } from '../util';

export default (event: TrackEventType, settings: SegmentAdjustSettings) => {
  const anonId = event.anonymousId;
  if (anonId && anonId.length > 0) {
    Adjust.addSessionPartnerParameter('anonymous_id', anonId);
  }

  const token = mappedCustomEventToken(event.event, settings);
  if (token) {
    const adjEvent = new AdjustEvent(token);

    const properties = event.properties;
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        adjEvent.addCallbackParameter(key, value as string);
      });

      const revenue = extract<number>('revenue', properties);
      const currency = extract<string>('currency', properties, 'USD');
      const orderId = extract<string>('orderId', properties);

      if (revenue && currency) {
        adjEvent.setRevenue(revenue, currency);
      }

      if (orderId) {
        adjEvent.setTransactionId(orderId);
      }
    }

    Adjust.trackEvent(adjEvent);
  }
};
