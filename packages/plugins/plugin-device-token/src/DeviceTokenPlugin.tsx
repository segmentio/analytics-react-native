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
    checkUserPermission();

  async configure(analytics: SegmentClient) {
    const isAuthorized = await this.authStatus;
    this.analytics = analytics;

    if (isAuthorized) {
      this.retrieveDeviceToken();
    } else {
      this.analytics?.logger.warn('Not authorized to retrieve device token');
    }
  }

  async retrieveDeviceToken() {
    if (Platform.OS === 'ios') {
      let APNSToken = await messaging().getAPNSToken();
      if (APNSToken !== null) {
        await this.analytics?.context.set({ device: { token: APNSToken } });
        this.analytics?.track('Device Token Retrieved');
      }
    } else if (Platform.OS === 'android') {
      let deviceToken = await messaging().getToken();
      if (deviceToken !== undefined && deviceToken.length) {
        await this.analytics?.context.set({ device: { token: deviceToken } });
        this.analytics?.track('Device Token Retrieved');
      } else {
        this.analytics?.logger.warn(
          'Device token only available on iOS and Android platforms'
        );
      }
    }
  }

  async updatePermissionStatus() {
    const isAuthorized = await this.authStatus;

    if (isAuthorized) {
      this.retrieveDeviceToken();
    }
  }
}

async function checkUserPermission() {
  return await messaging().hasPermission();
}
