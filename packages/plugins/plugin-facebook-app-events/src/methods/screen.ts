import type { ScreenEventType } from '@segment/analytics-react-native';
import { AppEventsLogger, Params } from 'react-native-fbsdk-next';
import { sanitizeValue } from '../utils';

const PREFIX = 'Viewed';
const SUFFIX = 'Screen';
const MAX_CHARACTERS_EVENT_NAME = 40 - PREFIX.length - SUFFIX.length;

const sanitizeName = (name: string) => {
  const trimmedName = name.substring(0, MAX_CHARACTERS_EVENT_NAME);
  return `${PREFIX} ${trimmedName} ${SUFFIX}`;
};

const sanitizeEvent = (event: ScreenEventType): Params => {
  const properties: Params = {};
  if (event.properties === undefined || event.properties === null) {
    return {};
  }

  for (const key of Object.keys(event.properties)) {
    const sanitized = sanitizeValue(event.properties[key]);
    if (sanitized !== undefined) {
      properties[key] = sanitized;
    }
  }

  return { ...properties };
};

export default (event: ScreenEventType) => {
  const name = sanitizeName(event.name);
  const params = sanitizeEvent(event);

  AppEventsLogger.logEvent(name, params);
};
