import type { ScreenEventType } from '@segment/analytics-react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';

// FB Event Names must be <= 40 characters
// 'Viewed' and 'Screen' with spaces take up 14
const MAX_CHARACTERS_EVENT_NAME = 26;

const sanitizeName = (name: string) => {
  let trimmedName = name.substring(0, MAX_CHARACTERS_EVENT_NAME);
  return `Viewed ${trimmedName} Screen`;
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
