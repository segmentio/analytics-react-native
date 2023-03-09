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
  authStatus: Promise<FirebaseMessagingTypes.AuthorizationStatus | undefined> =
    this.checkUserPermission();

  async configure(analytics: SegmentClient) {
    const isAuthorized = await this.authStatus;
    this.analytics = analytics;

    if (isAuthorized) {
      let token = await this.getDeviceToken();

      if (token !== undefined) {
        this.setDeviceToken(token);
      }
    } else {
      this.analytics?.logger.warn('Not authorized to retrieve device token');
    }
  }

  private async getDeviceToken(): Promise<string | undefined> {
    if (Platform.OS === 'ios') {
      return (await messaging().getAPNSToken()) ?? undefined;
    }
    if (Platform.OS === 'android') {
      let deviceToken = (await messaging().getToken()) ?? undefined;
      if (deviceToken !== undefined && deviceToken.length > 0) {
        return deviceToken;
      } else {
        return undefined;
      }
    }
    this.analytics?.logger.warn(
      'Device token only available on iOS and Android platforms'
    );
    return undefined;
  }

  async setDeviceToken(token: string) {
    await this.analytics?.context.set({ device: { token: token } });
    this.analytics?.track('Device Token Retrieved');
  }

  async updatePermissionStatus() {
    const isAuthorized = await this.checkUserPermission();

    if (isAuthorized) {
      let token = await this.getDeviceToken();

      if (token !== undefined) {
        this.setDeviceToken(token);
      }
    }
  }

  private async checkUserPermission(): Promise<
    FirebaseMessagingTypes.AuthorizationStatus | undefined
  > {
    try {
      return await messaging().hasPermission();
    } catch (e) {
      this.analytics?.logger.warn(e);
      return undefined;
    }
  }
}
