import {
  DestinationPlugin,
  IdentifyEventType,
  PluginType,
  TrackEventType,
  UpdateType,
  SegmentAPISettings,
  SegmentError,
  ErrorType,
} from '@segment/analytics-react-native';
import type { SegmentAppsflyerSettings } from './types';
import appsFlyer from 'react-native-appsflyer';
import identify from './methods/identify';
import track from './methods/track';

export class AppsflyerPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = 'AppsFlyer';

  private settings: SegmentAppsflyerSettings | null = null;
  private hasRegisteredInstallCallback = false;
  private hasRegisteredDeepLinkCallback = false;
  private hasInitialized = false;

  async update(settings: SegmentAPISettings, _: UpdateType): Promise<void> {
    const defaultOpts = {
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
      this.registerUnifiedDeepLinkCallback();

      this.hasRegisteredDeepLinkCallback = true;
    }
    if (!this.hasInitialized) {
      try {
        await appsFlyer.initSdk({
          devKey: this.settings.appsFlyerDevKey,
          appId: this.settings.appleAppID,
          onDeepLinkListener: clientConfig?.trackDeepLinks === true,
          ...defaultOpts,
        });
        this.hasInitialized = true;
      } catch (error) {
        const message = 'AppsFlyer failed to initialize';
        this.analytics?.reportInternalError(
          new SegmentError(ErrorType.PluginError, message, error)
        );
        this.analytics?.logger.warn(`${message}: ${JSON.stringify(error)}`);
      }
    }
  }

  identify(event: IdentifyEventType) {
    identify(event);
    return event;
  }

  async track(event: TrackEventType) {
    await track(event);
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

      if (Boolean(is_first_launch) && JSON.parse(is_first_launch) === true) {
        if (af_status === 'Non-organic') {
          void this.analytics?.track('Install Attributed', properties);
        } else {
          void this.analytics?.track('Organic Install', {
            provider: 'AppsFlyer',
          });
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
        void this.analytics?.track('Deep Link Opened', properties);
      }
    });
  };

  registerUnifiedDeepLinkCallback = () => {
    appsFlyer.onDeepLink((res) => {
      if (res.deepLinkStatus !== 'NOT_FOUND') {
        const { DLValue, media_source, campaign } = res.data;
        const properties = {
          deepLink: DLValue as string,
          campaign: {
            name: campaign,
            source: media_source,
          },
        };
        void this.analytics?.track('Deep Link Opened', properties);
      }
    });
  };
}
