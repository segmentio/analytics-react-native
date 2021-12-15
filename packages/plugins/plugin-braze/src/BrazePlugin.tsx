import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
} from '@segment/analytics-react-native';
import identify from './methods/identify';
import track from './methods/track';
import flush from './methods/flush';

export class BrazePlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'Braze';

  identify(event: IdentifyEventType) {
    const currentUserInfo = this.analytics?.userInfo.get();

    if(currentUserInfo?.userId !== event.userId ||
      currentUserInfo?.anonymousId !== event.anonymousId ||
      currentUserInfo?.traits !== event.traits
      ){
      identify(event);
    } else {
      let integrations = event.integrations; 
      
      if(integrations !== undefined) {
        integrations[this.key] = false;
      }
    }
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  flush() {
    flush();
  }
}
