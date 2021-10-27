import appsFlyer from 'react-native-appsflyer';
import type { TrackEventType } from '@segment/analytics-react-native';

type Properties = { [key: string]: any };

export default (event: TrackEventType) => {
  const properties = event.properties || {};

  const revenue = extractRevenue('revenue', properties);
  const currency = extractCurrency('currency', properties, 'USD');

  if (revenue && currency) {
    const otherProperties = Object.entries(properties)
      .filter(([key]) => key !== 'revenue' && key !== 'currency')
      .reduce((acc: Properties, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {});

    appsFlyer.logEvent(event.event, {
      ...otherProperties,
      af_revenue: revenue,
      af_currency: currency,
    });
  } else {
    appsFlyer.logEvent(event.event, properties);
  }
};

const extractRevenue = (key: string, properties: Properties): number | null => {
  if (!properties[key]) {
    return null;
  }

  switch (typeof properties[key]) {
    case 'number':
      return properties[key];
    case 'string':
      return parseFloat(properties[key]);
    default:
      return null;
  }
};

const extractCurrency = (
  key: string,
  properties: Properties,
  defaultCurrency: string
) => {
  return properties[key] || defaultCurrency;
};
