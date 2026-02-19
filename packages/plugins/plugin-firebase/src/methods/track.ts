import {
  type TrackEventType,
  generateMapTransform,
} from '@segment/analytics-react-native';
import { firebaseAnalytics } from '../firebaseAnalytics';
import { mapEventProps, transformMap } from './parameterMapping';

const mappedPropNames = generateMapTransform(mapEventProps, transformMap);

const sanitizeName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
};

export default async (event: TrackEventType) => {
  const safeEvent = mappedPropNames(
    event as unknown as Record<string, unknown>
  );
  const convertedName = safeEvent.event as string;
  let safeEventName = sanitizeName(convertedName);
  const safeProps = safeEvent.properties as { [key: string]: unknown };
  // Clip the event name if it exceeds 40 characters
  if (safeEventName.length > 40) {
    safeEventName = safeEventName.substring(0, 40);
  }
  await firebaseAnalytics.logEvent(safeEventName, safeProps);
};
