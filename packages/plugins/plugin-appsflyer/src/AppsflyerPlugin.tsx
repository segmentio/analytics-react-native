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
import appsFlyer, {
  ConversionData,
  OnAppOpenAttributionData,
  UnifiedDeepLinkData,
} from 'react-native-appsflyer';
import identify from './methods/identify';
import track from './methods/track';

export class AppsflyerPlugin extends DestinationPlugin {
  constructor(props?: {
    timeToWaitForATTUserAuthorization: number;
    is_adset: boolean;
    is_adset_id: boolean;
    is_ad_id: boolean;
    onDeepLink?: (data: UnifiedDeepLinkData) => void;
    onInstallConversionData?: (data: ConversionData) => void;
    onAppOpenAttribution?: (data: OnAppOpenAttributionData) => void;
  }) {
    super();
    if (props != null) {
      this.timeToWaitForATTUserAuthorization =
        props.timeToWaitForATTUserAuthorization;
      this.is_adset = props.is_adset === undefined ? false : props.is_adset;
      this.is_ad_id = props.is_ad_id === undefined ? false : props.is_ad_id;
      this.is_adset_id =
        props.is_adset_id === undefined ? false : props.is_adset_id;
      this.onDeepLink = props.onDeepLink;
      this.onInstallConversionData = props.onInstallConversionData;
      this.onAppOpenAttribution = props.onAppOpenAttribution;
    }
  }
  type = PluginType.destination;
  key = 'AppsFlyer';
  is_adset = false;
  is_adset_id = false;
  is_ad_id = false;
  onDeepLink?: (data: UnifiedDeepLinkData) => void;
  onInstallConversionData?: (data: ConversionData) => void;
  onAppOpenAttribution?: (data: OnAppOpenAttributionData) => void;
  private settings: SegmentAppsflyerSettings | null = null;
  private hasRegisteredInstallCallback = false;
  private hasRegisteredDeepLinkCallback = false;
  private hasInitialized = false;

  timeToWaitForATTUserAuthorization = 60;

  async update(settings: SegmentAPISettings, _: UpdateType): Promise<void> {
    const defaultOpts = {
      isDebug: false,
      timeToWaitForATTUserAuthorization: this.timeToWaitForATTUserAuthorization,
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
      const {
        af_status,
        media_source,
        campaign,
        is_first_launch,
        adset_id,
        ad_id,
        adset,
      } = res?.data;
      const properties = {
        provider: this.key,
        campaign: {
          source: media_source,
          name: campaign,
        },
      };
      if (this.is_adset_id) {
        Object.assign(properties, { adset_id: adset_id });
      }
      if (this.is_ad_id) {
        Object.assign(properties, { ad_id: ad_id });
      }
      if (this.is_adset) {
        Object.assign(properties, { adset: adset });
      }
      if (Boolean(is_first_launch) && JSON.parse(is_first_launch) === true) {
        if (af_status === 'Non-organic') {
          this.analytics
            ?.track('Install Attributed', properties)
            .then(() =>
              this.analytics?.logger.info(
                'Sent Install Attributed event to Segment'
              )
            );
        } else {
          this.analytics
            ?.track('Organic Install', {
              provider: 'AppsFlyer',
            })
            .then(() =>
              this.analytics?.logger.info(
                'Sent Organic Install event to Segment'
              )
            );
        }
      }
      this.onInstallConversionData?.(res);
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
        this.analytics
          ?.track('Deep Link Opened', properties)
          .then(() =>
            this.analytics?.logger.info(
              'Sent Deep Link Opened event to Segment'
            )
          );
      }
      this.onAppOpenAttribution?.(res);
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
        this.analytics
          ?.track('Deep Link Opened', properties)
          .then(() =>
            this.analytics?.logger.info(
              'Sent Deep Link Opened event to Segment'
            )
          );
      }
      this.onDeepLink?.(res);
    });
  };
}
