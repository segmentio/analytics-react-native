import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
} from '@segment/analytics-react-native';
import appsFlyer, { InitSDKOptions } from 'react-native-appsflyer';
import identify from './methods/identify';
import track from './methods/track';

export class AppsflyerPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Appsflyer';

  constructor(opts: InitSDKOptions) {
    super();

    const defaultOpts = {
      isDebug: true,
      timeToWaitForATTUserAuthorization: 60,
    };

    appsFlyer.initSdk({
      ...defaultOpts,
      ...opts,
    });
  }

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }
}
