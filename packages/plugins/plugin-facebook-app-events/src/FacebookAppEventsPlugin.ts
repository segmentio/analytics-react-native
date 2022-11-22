import {
  DestinationPlugin,
  ErrorType,
  generateMapTransform,
  IntegrationSettings,
  PluginType,
  ScreenEventType,
  SegmentAPISettings,
  SegmentClient,
  SegmentError,
  TrackEventType,
  UpdateType,
} from '@segment/analytics-react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

import screen from './methods/screen';
import { mapEventProps, transformMap } from './parameterMapping';

const FB_PLUGIN_KEY = 'Facebook App Events';
// FB Event Names must be <= 40 characters
const MAX_CHARACTERS_EVENT_NAME = 40;
const mappedPropNames = generateMapTransform(mapEventProps, transformMap);

interface FBPluginSettings extends Record<string, any> {
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
  event: Record<string, any>
): { [key: string]: string | number } => {
  let products = event.properties.products ?? [];
  const productCount = (event.properties.fb_num_items || products.length) ?? 0;
  let params: { [key: string]: string | number } = {};
  let logTime = event.timestamp ?? undefined;

  Object.keys(event.properties).forEach((property: string) => {
    if (Object.values(mapEventProps).some((fbProp) => fbProp === property)) {
      params[property] = event.properties[property];
    }
  });

  return {
    ...params,
    fb_num_items: productCount,
    _logTime: logTime,
    _appVersion: event.context.app.version,
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
    let adTrackingEnabled = this.analytics?.adTrackingEnabled.get();

    this.analytics.adTrackingEnabled.onChange((value) => {
      Settings.setAdvertiserTrackingEnabled(value);
    });

    //you will likely need consent first
    //this example assumes consentManager plugin is used
    await Settings.initializeSDK();

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
    const safeEvent = mappedPropNames(event as Record<string, any>);
    let convertedName = safeEvent.event as string;
    let safeName = this.sanitizeEventName(convertedName);
    let safeProps = sanitizeEvent(safeEvent);
    const currency = (safeProps.fb_currency as string | undefined) ?? 'USD';

    if (
      safeProps._valueToSum !== undefined &&
      safeName === 'fb_mobile_purchase'
    ) {
      let purchasePrice = safeProps._valueToSum as number;

      AppEventsLogger.logPurchase(purchasePrice, currency, safeProps);
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
    let sanitizedName = fbName.replace('.', '_');
    return sanitizedName.substring(0, MAX_CHARACTERS_EVENT_NAME);
  }
}
