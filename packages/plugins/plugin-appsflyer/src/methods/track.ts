import appsFlyer from 'react-native-appsflyer';
import { TrackEventType } from '@segment/analytics-react-native';

type Properties = { [key: string]: unknown };

export default async (event: TrackEventType) => {
  const properties = event.properties || {};

  const revenue = extractRevenue('revenue', properties);
  const currency = extractCurrency('currency', properties, 'USD');

  if (
    revenue !== undefined &&
    revenue !== null &&
    currency !== undefined &&
    currency !== null
  ) {
    const otherProperties = Object.entries(properties)
      .filter(([key]) => key !== 'revenue' && key !== 'currency')
      .reduce((acc: Properties, [key, val]) => {
        acc[key] = val;
        return acc;
      }, {});

    await appsFlyer.logEvent(event.event, {
      ...otherProperties,
      af_revenue: revenue,
      af_currency: currency,
    });
  } else {
    await appsFlyer.logEvent(event.event, properties);
  }
};

const extractRevenue = (key: string, properties: Properties): number | null => {
  const value = properties[key];
  if (value === undefined || value === null) {
    return null;
  }

  switch (typeof value) {
    case 'number':
      return value;
    case 'string':
      return parseFloat(value);
    default:
      return null;
  }
};

const extractCurrency = (
  key: string,
  properties: Properties,
  defaultCurrency: string
): string => {
  const value = properties[key];
  if (typeof value === 'string')) {
    return value;
  }
  return defaultCurrency;
};
