import { BranchEvent } from 'react-native-branch';
import { generateMapTransform } from '@segment/analytics-react-native';
import type { ScreenEventType } from '@segment/analytics-react-native';
import { mapEventProps, transformMap } from './parameterMapping';
import { createBranchEventWithProps } from './util';

export default async (event: ScreenEventType) => {
  const transformEvent = generateMapTransform(mapEventProps, transformMap);
  const safeEvent = transformEvent(event as Record<string, any>);
  const safeProps = safeEvent.properties as { [key: string]: any };
  const branchEvent = await createBranchEventWithProps(
    BranchEvent.ViewItem,
    safeProps,
    true
  );
  await branchEvent.logEvent();
};
