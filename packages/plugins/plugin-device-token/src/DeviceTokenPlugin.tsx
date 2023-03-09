import {
  PlatformPlugin,
  SegmentClient,
  PluginType,
} from '@segment/analytics-react-native';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export class DeviceTokenPlugin extends PlatformPlugin {
  type = PluginType.enrichment;

  async configure(analytics: SegmentClient) {
    const isAuthorized = await this.checkUserPermission();
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
        this.setDeviceToken(APNSToken);
      }
    } else if (Platform.OS === 'android') {
      let deviceToken = await messaging().getToken();
      if (deviceToken !== undefined && deviceToken.length) {
        this.setDeviceToken(deviceToken);
      } else {
        this.analytics?.logger.warn(
          'Device token only available on iOS and Android platforms'
        );
      }
    }
  }

  async setDeviceToken(token: string) {
    await this.analytics?.context.set({ device: { token: token } });
    this.analytics?.track('Device Token Retrieved');
  }

  async updatePermissionStatus() {
    const isAuthorized = await this.checkUserPermission();

    if (isAuthorized) {
      this.retrieveDeviceToken();
    }
  }

  async checkUserPermission() {
    try {
      return await messaging().hasPermission();
    } catch (e) {
      this.analytics?.logger.warn(e);
      return;
    }
  }
}
