import {
  Plugin,
  PluginType,
  SegmentEvent,
} from '@segment/analytics-react-native';

import type { SegmentClient } from '@segment/analytics-react-native/src/analytics';

import { Alert } from 'react-native';

export class ConsentManager extends Plugin {
  type = PluginType.before;
  key = 'Consent Manager';

  consentStatus?: boolean;
  queuedEvents: SegmentEvent[] = [];

  configure(analytics: SegmentClient) {
    this.analytics = analytics;

    this.showAlert();
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    if (this.consentStatus === true) {
      return event;
    }
    if (this.consentStatus === undefined) {
      this.queuedEvents.push(event);
      return;
    }
    return;
  }

  showAlert = () => {
    Alert.alert(
      'Consent to Tracking',
      'Do you consent to all of the things?',
      [
        {
          text: 'Yes',
          onPress: () => this.handleConsent(true),
          style: 'cancel',
        },
        {
          text: 'No',
          onPress: () => this.handleConsent(false),
          style: 'cancel',
        },
      ],
      {
        cancelable: true,
        onDismiss: () => (this.consentStatus = undefined),
      }
    );
  };

  handleConsent(status: boolean) {
    if (status === true) {
      this.consentStatus = true;
      this.sendQueued();
      this.analytics?.track('Consent Authorized');
    }
    if (status === false) {
      this.queuedEvents = [];
    }
  }

  sendQueued() {
    this.queuedEvents.forEach((event) => {
      this.analytics?.process(event);
    });
    this.queuedEvents = [];
  }
}
