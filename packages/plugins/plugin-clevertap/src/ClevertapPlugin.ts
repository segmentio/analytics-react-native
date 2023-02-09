import {
  DestinationPlugin,
  PluginType,
  TrackEventType,
  ScreenEventType,
  IdentifyEventType,
  generateMapTransform,
} from '@segment/analytics-react-native';

import { mapTraits, transformMap } from './parameterMapping';
import CleverTap from 'clevertap-react-native';
const mappedTraits = generateMapTransform(mapTraits, transformMap);

export class ClevertapPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'CleverTap';

  identify(event: IdentifyEventType) {
    const traits = event.traits as Record<string, any>;
    const safeTraits = mappedTraits(traits);
    const userId = event.userId ?? event.anonymousId;

    let clevertapTraits = { ...safeTraits, Identity: userId };

    CleverTap.profileSet(clevertapTraits);
    return event;
  }

  track(event: TrackEventType) {
    if (event.event === 'Order Completed') {
      const userId = event.userId ?? event.anonymousId;
      let { products = [], ...props } = event.properties ?? {};
      let chargeDetails = { ...props, Identity: userId };
      let sanitizedProducts = products ?? [];

      CleverTap.recordChargedEvent(chargeDetails, sanitizedProducts);
    } else {
      CleverTap.recordEvent(event.event, event.properties);
    }
    return event;
  }

  screen(event: ScreenEventType) {
    const screenName = event.name ?? 'Screen Viewed';
    const userId = event.userId ?? event.anonymousId;
    const screenProps = { ...event.properties, Identity: userId };

    CleverTap.recordEvent(screenName, screenProps);
    return event;
  }
}
