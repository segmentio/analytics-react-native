import type { ScreenEventType } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';

const PREFIX = 'Viewed';
const SUFFIX = 'Screen';
const MAX_CHARACTERS_EVENT_NAME = 40 - PREFIX.length - SUFFIX.length;

const sanitizeName = (name: string) => {
  let trimmedName = name.substring(0, MAX_CHARACTERS_EVENT_NAME);
  return `${PREFIX} ${trimmedName} ${SUFFIX}`;
};

const sanitizeEvent = (
  event: Record<string, any>
): { [key: string]: string | number } => {
  let properties = event.properties ?? {};

  return { ...properties };
};
export default async (event: ScreenEventType) => {
  let name = sanitizeName(event.name);
  let params = sanitizeEvent(event);

  AppEventsLogger.logEvent(name, params);
};
