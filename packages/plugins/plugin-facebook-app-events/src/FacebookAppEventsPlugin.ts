import {
  Context,
  DestinationPlugin,
  ErrorType,
  generateMapTransform,
  IntegrationSettings,
  isNumber,
  isObject,
  PluginType,
  ScreenEventType,
  SegmentAPISettings,
  SegmentClient,
  SegmentError,
  TrackEventType,
  unknownToString,
  UpdateType,
} from '@segment/analytics-react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

import screen from './methods/screen';
import { mapEventProps, transformMap } from './parameterMapping';
import { sanitizeValue } from './utils';

const FB_PLUGIN_KEY = 'Facebook App Events';
// FB Event Names must be <= 40 characters
const MAX_CHARACTERS_EVENT_NAME = 40;
const mappedPropNames = generateMapTransform(mapEventProps, transformMap);

interface FBPluginSettings extends Record<string, unknown> {
  trackScreenEvent?: boolean;
  limitedDataUse?: boolean;
  appEvents?: { [key: string]: string };
}

const isFBPluginSettings = (
  settings: IntegrationSettings
): settings is FBPluginSettings => {
  return (
    typeof settings === 'object' &&
    Object.keys(settings).some(
      (k) =>
        k === 'trackScreenEvents' || k === 'appEvents' || k === 'limitedDataUse'
    )
  );
};

const sanitizeEvent = (
  event: Record<string, unknown>
): { [key: string]: string | number } => {
  const properties = event.properties;
  if (!isObject(properties)) {
    return {};
  }

  const products = Array.isArray(properties.products)
    ? properties.products
    : [];
  const productCount = isNumber(properties.fb_num_items)
    ? properties.fb_num_items
    : products.length;
  const params: { [key: string]: string | number } = {};

  for (const key of Object.keys(properties)) {
    if (Object.values(mapEventProps).includes(key)) {
      const sanitized = sanitizeValue(properties[key]);
      if (sanitized !== undefined) {
        params[key] = sanitized;
      }
    }
  }

  if (isNumber(event._logTime)) {
    params._logTime = event._logTime;
  }

  // Map messageId to event_id to support FB deduplication
  // https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events#event-deduplication-options
  const messageId = unknownToString(event.messageId);
  if (messageId !== null && messageId !== undefined && messageId !== '') {
    params.event_id = messageId;
  }

  return {
    ...params,
    fb_num_items: productCount,
    _appVersion: (event.context as Context).app.version,
  };
};

export class FacebookAppEventsPlugin extends DestinationPlugin {
  type = PluginType.destination;
  key = FB_PLUGIN_KEY;
  trackScreens = false;
  limitedDataUse = false;
  /**
   * Mappings for event names from Segment Settings
   */
  appEvents: { [key: string]: string } = {};

  async configure(analytics: SegmentClient) {
    this.analytics = analytics;
    const adTrackingEnabled = this.analytics?.adTrackingEnabled.get();

    this.analytics.adTrackingEnabled.onChange((value) => {
      void (async () => {
        try {
          await Settings.setAdvertiserTrackingEnabled(value);
        } catch (error) {
          this.analytics?.reportInternalError(
            new SegmentError(
              ErrorType.PluginError,
              'Facebook failed to set AdvertiserTrackingEnabled',
              error
            )
          );
        }
      })();
    });

    //you will likely need consent first
    //this example assumes consentManager plugin is used
    Settings.initializeSDK();

    if (adTrackingEnabled) {
      try {
        await Settings.setAdvertiserTrackingEnabled(true);
      } catch (e) {
        //handle error
        this.analytics?.reportInternalError(
          new SegmentError(ErrorType.PluginError, JSON.stringify(e), e)
        );
        this.analytics?.logger.warn('Add Tracking Enabled Error', e);
      }
    }

    //default facebook data processing options
    Settings.setDataProcessingOptions([], 0, 0);
  }

  update(settings: SegmentAPISettings, _: UpdateType) {
    const fbSettings = settings.integrations[this.key];

    if (isFBPluginSettings(fbSettings)) {
      this.trackScreens = fbSettings.trackScreenEvent ?? false;
      this.limitedDataUse = fbSettings.limitedDataUse ?? false;
      this.appEvents = fbSettings.appEvents ?? {};

      if (this.limitedDataUse) {
        // Enable LDU
        Settings.setDataProcessingOptions(['LDU']);
      }
    }
  }

  track(event: TrackEventType) {
    const safeEvent = mappedPropNames(
      event as unknown as Record<string, unknown>
    );
    const convertedName = safeEvent.event as string;
    const safeName = this.sanitizeEventName(convertedName);
    const safeProps = sanitizeEvent(safeEvent);
    const currency = (safeProps.fb_currency as string | undefined) ?? 'USD';

    if (
      safeProps._valueToSum !== undefined &&
      safeName === 'fb_mobile_purchase'
    ) {
      const purchasePrice = safeProps._valueToSum as number;

      AppEventsLogger.logPurchase(purchasePrice, currency, safeProps);
    } else if (typeof safeProps._valueToSum === 'number') {
      AppEventsLogger.logEvent(safeName, safeProps._valueToSum, safeProps);
    } else {
      AppEventsLogger.logEvent(safeName, safeProps);
    }
    return event;
  }

  screen(event: ScreenEventType) {
    if (this.trackScreens === true) {
      screen(event);
    }
    return event;
  }

  private sanitizeEventName(name: string) {
    //Facebook expects '_' instead of '.'
    const fbName = this.appEvents[name] ?? name;
    const sanitizedName = fbName.replace('.', '_');
    return sanitizedName.substring(0, MAX_CHARACTERS_EVENT_NAME);
  }
}
