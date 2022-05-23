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
  private hasRegisteredInstallCallback: boolean = false;
  private hasRegisteredDeepLinkCallback: boolean = false;
  private hasInitialized: boolean = false;

  update(settings: SegmentAPISettings, _: UpdateType) {
    let defaultOpts = {
      isDebug: false,
      timeToWaitForATTUserAuthorization: 60,
      onInstallConversionDataListener: true,
    };

    const appsflyerSettings = settings.integrations[
      this.key
    ] as SegmentAppsflyerSettings;

    if (appsflyerSettings === undefined) {
      return;
    }
    const clientConfig = this.analytics?.getConfig();

    this.settings = appsflyerSettings;

    if (
      this.settings.trackAttributionData &&
      !this.hasRegisteredInstallCallback
    ) {
      this.registerConversionCallback();
      this.hasRegisteredInstallCallback = true;
    }

    if (
      clientConfig?.trackDeepLinks === true &&
      !this.hasRegisteredDeepLinkCallback
    ) {
      this.registerDeepLinkCallback();
      this.hasRegisteredDeepLinkCallback = true;
    }
    if (!this.hasInitialized) {
      appsFlyer.initSdk({
        devKey: this.settings.appsFlyerDevKey,
        appId: this.settings.appleAppID,
        onDeepLinkListener: clientConfig?.trackDeepLinks === true,
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

  registerConversionCallback = () => {
    appsFlyer.onInstallConversionData((res) => {
      const { af_status, media_source, campaign, is_first_launch } = res?.data;
      const properties = {
        provider: this.key,
        campaign: {
          source: media_source,
          name: campaign,
        },
      };

      if (JSON.parse(is_first_launch) === true) {
        if (af_status === 'Non-organic') {
          this.analytics?.track('Install Attributed', properties);
        } else {
          this.analytics?.track('Organic Install', { provider: 'AppsFlyer' });
        }
      }
    });
  };

  registerDeepLinkCallback = () => {
    appsFlyer.onAppOpenAttribution((res) => {
      if (res?.status === 'success') {
        const { campaign, media_source } = res.data;
        const properties = {
          provider: this.key,
          campaign: {
            name: campaign,
            source: media_source,
          },
        };
        this.analytics?.track('Deep Link Opened', properties);
      }
    });
  };
}
