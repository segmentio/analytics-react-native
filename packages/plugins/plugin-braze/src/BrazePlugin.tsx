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
  key = 'Appboy';

  identify(event: IdentifyEventType) {
    let currentUserInfo = null;

    //check to see if anything has changed.
    //if it hasn't changed don't send event
    this.analytics?.userInfo.onChange((newUserInfo) => {
      if (newUserInfo !== undefined) {
        currentUserInfo = newUserInfo;
      }
    });

    if (currentUserInfo === null) {
      let integrations = event.integrations;

      if (integrations !== undefined) {
        integrations[this.key] = false;
      }
    } else {
      identify(event);
      currentUserInfo = null;
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
