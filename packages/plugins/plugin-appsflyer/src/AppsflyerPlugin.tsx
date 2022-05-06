import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  UpdateType,
  SegmentAPISettings,
} from '@segment/analytics-react-native';
import type { SegmentAppsflyerSettings } from './types';
import appsFlyer from 'react-native-appsflyer';
import identify from './methods/identify';
import track from './methods/track';

export class AppsflyerPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'AppsFlyer';

  private settings: SegmentAppsflyerSettings | null = null;
  private hasRegisteredInstallCallback: Boolean = false;
  private hasRegisteredDeepLinkCallback: Boolean = false;

  private hasInitialized: Boolean = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    let defaultOpts = {
      isDebug: true,
      timeToWaitForATTUserAuthorization: 60,
      onInstallConversionDataListener: true,
    };

    const appsflyerSettings = settings.integrations[
      this.key
    ] as SegmentAppsflyerSettings;

    if (!appsflyerSettings) {
      return;
    }
    const clientConfig = this.analytics?.getConfig();

    this.settings = appsflyerSettings;

    if (
      this.settings.trackAttributionData === true &&
      this.hasRegisteredInstallCallback === false
    ) {
      this.conversionCallback();
      this.hasRegisteredInstallCallback = true;
    }

    if (
      clientConfig?.trackDeepLinks === true &&
      this.hasRegisteredDeepLinkCallback === false
    ) {
      this.deepLinkCallback();
      this.hasRegisteredDeepLinkCallback = true;
    }

    if (
      this.hasInitialized === false &&
      clientConfig?.trackDeepLinks === true
    ) {
      appsFlyer.initSdk({
        devKey: this.settings.appsFlyerDevKey,
        appId: this.settings.appleAppID,
        onDeepLinkListener: true,
        ...defaultOpts,
      });
      this.hasInitialized = true;
    } else {
      appsFlyer.initSdk({
        devKey: this.settings.appsFlyerDevKey,
        appId: this.settings.appleAppID,
        ...defaultOpts,
      });
      this.hasInitialized = true;
    }
  }

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  track(event: TrackEventType) {
    track(event);
    return event;
  }

  conversionCallback = () => {
    appsFlyer.onInstallConversionData((res) => {
      const isFirstLaunch = JSON.parse(res?.data?.is_first_launch);
      const status = res?.data?.af_status;
      const properties = {
        provider: 'Appsflyer',
        campaign: {
          source: res?.data?.media_source,
          name: res?.data?.campaign,
        },
      };

      if (isFirstLaunch === true) {
        if (status === 'Non-organic') {
          this.analytics?.track('Install Attributed', properties);
        } else {
          this.analytics?.track('Organic Install', { provider: 'AppsFlyer' });
        }
      }
    });
  };

  deepLinkCallback = () => {
    appsFlyer.onAppOpenAttribution((res) => {
      if (res?.status === 'success') {
        const properties = {
          provider: 'Appsflyer',
          campaign: {
            name: res.data.campaign,
            source: res.data.media_source,
          },
        };
        this.analytics?.track('Deep Link Opened', properties);
      }
    });
  };
}
