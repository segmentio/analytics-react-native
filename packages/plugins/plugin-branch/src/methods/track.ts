import { generateMapTransform } from '@segment/analytics-react-native';
import type { TrackEventType } from '@segment/analytics-react-native';
import { mapEventNames, mapEventProps, transformMap } from './parameterMapping';
import { createBranchEventWithProps } from './util';

export default async (event: TrackEventType) => {
  const transformEvent = generateMapTransform(mapEventProps, transformMap);
  const safeEvent = transformEvent(event as unknown as Record<string, unknown>);
  const safeEventName = safeEvent.event as string;
  const safeProps = safeEvent.properties as { [key: string]: unknown };
  const isStandardBranchEvent = event.event in mapEventNames;
  const branchEvent = await createBranchEventWithProps(
    safeEventName,
    safeProps,
    isStandardBranchEvent
  );
  await branchEvent.logEvent();
};
