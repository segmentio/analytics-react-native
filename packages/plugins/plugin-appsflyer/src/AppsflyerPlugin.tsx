import {
  DestinationPlugin,
  IdentifyEventType,
  JsonMap,
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
  DeepLinkData,
} from 'react-native-appsflyer';
import identify from './methods/identify';
import track from './methods/track';

export class AppsflyerPlugin extends DestinationPlugin {
  constructor(props?: {
    is_adset: boolean;
    is_adset_id: boolean;
    is_ad_id: boolean;
    onDeepLink?: (data: DeepLinkData) => void;
    onInstallConversionData?: (data: ConversionData) => void;
  }) {
    super();
    if (props != null) {
      this.is_adset = props.is_adset === undefined ? false : props.is_adset;
      this.is_ad_id = props.is_ad_id === undefined ? false : props.is_ad_id;
      this.is_adset_id =
        props.is_adset_id === undefined ? false : props.is_adset_id;
      this.onDeepLink = props.onDeepLink;
      this.onInstallConversionData = props.onInstallConversionData;
    }
  }
  type = PluginType.destination;
  key = 'AppsFlyer';
  is_adset = false;
  is_adset_id = false;
  is_ad_id = false;
  onDeepLink?: (data: DeepLinkData) => void;
  onInstallConversionData?: (data: ConversionData) => void;
  private settings: SegmentAppsflyerSettings | null = null;
  private hasRegisteredInstallCallback = false;
  private hasRegisteredDeepLinkCallback = false;
  private hasInitialized = false;

  async update(settings: SegmentAPISettings, _: UpdateType): Promise<void> {
    const appsflyerSettings = settings.integrations[
      this.key
    ] as SegmentAppsflyerSettings;

    if (appsflyerSettings === undefined) {
      return;
    }
    const clientConfig = this.analytics?.getConfig();

    this.settings = appsflyerSettings;

    // Must reach native before init(): Android permanently drops a deep link that resolves with no listener attached.
    if (
      clientConfig?.trackDeepLinks === true &&
      !this.hasRegisteredDeepLinkCallback
    ) {
      this.registerDeepLinkCallback();
      this.hasRegisteredDeepLinkCallback = true;
    }

    const initialization = this.hasInitialized
      ? undefined
      : appsFlyer.init({
          devKey: this.settings.appsFlyerDevKey,
          appId: this.settings.appleAppID,
        });
    this.hasInitialized = true;

    if (
      this.settings.trackAttributionData &&
      !this.hasRegisteredInstallCallback
    ) {
      this.registerConversionCallback();
      this.hasRegisteredInstallCallback = true;
    }

    if (initialization === undefined) {
      return;
    }
    this.registerSessionReadyCallback();
    try {
      await initialization;
    } catch (error) {
      this.hasInitialized = false;
      this.reportError('AppsFlyer failed to initialize', error);
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

  registerSessionReadyCallback = () => {
    appsFlyer
      .registerSessionReadyListener(() => {
        appsFlyer
          .start()
          .catch((error) =>
            this.reportError('AppsFlyer failed to start', error)
          );
      })
      .catch((error) =>
        this.reportError(
          'AppsFlyer failed to register the session ready listener',
          error
        )
      );
  };

  registerConversionCallback = () => {
    appsFlyer
      .registerConversionListener({
        onConversionDataSuccess: (data) => {
          const {
            af_status,
            media_source,
            campaign,
            is_first_launch,
            adset_id,
            ad_id,
            adset,
          } = data as JsonMap;
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
          if (is_first_launch === true || is_first_launch === 'true') {
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
          this.onInstallConversionData?.(data);
        },
      })
      .catch((error) =>
        this.reportError(
          'AppsFlyer failed to register the conversion listener',
          error
        )
      );
  };

  registerDeepLinkCallback = () => {
    appsFlyer
      .registerDeepLinkListener({
        onDeepLinking: (data) => {
          if (data.status === 'FOUND' && data.deepLink !== undefined) {
            const { deep_link_value, media_source, campaign } =
              data.deepLink as JsonMap;
            const properties = {
              provider: this.key,
              deepLink: deep_link_value,
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
          this.onDeepLink?.(data);
        },
      })
      .catch((error) =>
        this.reportError(
          'AppsFlyer failed to register the deep link listener',
          error
        )
      );
  };

  private reportError(message: string, error: unknown) {
    this.analytics?.reportInternalError(
      new SegmentError(ErrorType.PluginError, message, error)
    );
    this.analytics?.logger.warn(`${message}: ${JSON.stringify(error)}`);
  }
}
