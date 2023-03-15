import firebaseAnalytics from '@react-native-firebase/analytics';
import {
  generateMapTransform,
  TrackEventType,
} from '@segment/analytics-react-native';
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
  const safeEventName = sanitizeName(convertedName);
  const safeProps = safeEvent.properties as { [key: string]: unknown };
  await firebaseAnalytics().logEvent(safeEventName, safeProps);
};
