import {
  PlatformPlugin,
  SegmentClient,
  PluginType,
} from '@segment/analytics-react-native';
import { Platform } from 'react-native';

import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';

export class DeviceTokenPlugin extends PlatformPlugin {
  type = PluginType.enrichment;

  authStatus: Promise<FirebaseMessagingTypes.AuthorizationStatus> =
    requestUserPermission();
  APNSToken: Promise<string | null> | null | string = null;

  async configure(analytics: SegmentClient) {
    const isAuthorized = await this.authStatus;
    this.analytics = analytics;

    if (isAuthorized) {
      this.requestDeviceToken();
    } else {
      this.analytics?.logger.warn('Not authorized to retrieve device token');
    }
  }

  async requestDeviceToken() {
    if (Platform.OS === 'ios') {
      this.APNSToken = await retrieveAPNSToken();
      if (this.APNSToken !== null) {
        this.analytics?.context.set({ device: { token: this.APNSToken } });
        this.analytics?.track('Push Notifications Enabled');
      }
    } else {
      let deviceToken = await getDeviceToken();
      if (deviceToken !== undefined && deviceToken.length) {
        await this.analytics?.context.set({ device: { token: deviceToken } });
        this.analytics?.track('Push Notifications Enabled');
      } else {
        this.analytics?.logger.warn('Unable to retrieve device token');
      }
    }
  }

  async updatePermissionStatus() {
    const isAuthorized = await this.authStatus;

    if (isAuthorized) {
      this.requestDeviceToken();
    }
  }
}

async function retrieveAPNSToken() {
  if (Platform.OS === 'ios') {
    return await messaging().getAPNSToken();
  } else {
    return null;
  }
}

async function requestUserPermission() {
  return await messaging().hasPermission();
}

async function getDeviceToken() {
  return await messaging().getToken();
}
