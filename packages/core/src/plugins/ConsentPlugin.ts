import { Plugin } from '../plugin';
import { PluginType } from '../types';
import type {
  IntegrationSettings,
  SegmentAPIIntegration,
  SegmentEvent,
  TrackEventType,
} from '../types';
import type { DestinationPlugin } from '../plugin';
import type { SegmentClient } from '../analytics';

import { SEGMENT_DESTINATION_KEY } from './SegmentDestination';

const CONSENT_PREF_UPDATE_EVENT = 'Segment Consent Preference';

export interface CategoryConsentStatusProvider {
  setApplicableCategories(categories: string[]): void;
  getConsentStatus(): Promise<Record<string, boolean>>;
  onConsentChange(cb: (updConsent: Record<string, boolean>) => void): void;
  shutdown?(): void;
}

/**
 * This plugin interfaces with the consent provider and it:
 *
 * - stamps all events with the consent metadata.
 * - augments all destinations with a consent filter plugin that prevents events from reaching them if
 * they are not compliant current consent setup
 * - listens for consent change from the provider and notifies Segment
 */
export class ConsentPlugin extends Plugin {
  type = PluginType.before;
  private consentCategoryProvider: CategoryConsentStatusProvider;
  private categories: string[];

  constructor(
    consentCategoryProvider: CategoryConsentStatusProvider,
    categories: string[]
  ) {
    super();
    this.consentCategoryProvider = consentCategoryProvider;
    this.categories = categories;
  }

  configure(analytics: SegmentClient): void {
    super.configure(analytics);
    analytics.getPlugins().forEach(this.injectConsentFilterIfApplicable);
    analytics.onPluginLoaded(this.injectConsentFilterIfApplicable);
    this.consentCategoryProvider.setApplicableCategories(this.categories);
    this.consentCategoryProvider.onConsentChange(() => {
      this.notifyConsentChange();
    });

    let lastDeviceAttrs = analytics.context.get()?.device;
    analytics.context.onChange((c) => {
      const newAttrs = c?.device;
      if (JSON.stringify(lastDeviceAttrs) !== JSON.stringify(newAttrs)) {
        this.notifyConsentChange();
      }
      lastDeviceAttrs = newAttrs;
    });
  }

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    event.context = {
      ...event.context,
      consent: {
        categoryPreferences:
          await this.consentCategoryProvider.getConsentStatus(),
      },
    };

    return event;
  }

  shutdown(): void {
    this.consentCategoryProvider.shutdown?.();
  }

  private injectConsentFilterIfApplicable = (plugin: Plugin) => {
    if (this.isDestinationPlugin(plugin)) {
      plugin.add(
        new ConsentFilterPlugin((event) => {
          const allCategories =
            this.analytics?.consentSettings.get()?.allCategories || [];
          const settings = this.analytics?.settings.get() || {};
          const preferences = event.context?.consent?.categoryPreferences || {};

          if (plugin.key === SEGMENT_DESTINATION_KEY) {
            const noneConsented = allCategories.every(
              (category) => !preferences[category]
            );

            return (
              this.isConsentUpdateEvent(event) ||
              !this.isConsentFeatureSetup() ||
              !(noneConsented && !this.hasUnmappedDestinations())
            );
          }

          const integrationSettings = settings?.[plugin.key];

          if (this.containsConsentSettings(integrationSettings)) {
            const categories = integrationSettings.consentSettings.categories;
            return (
              !this.isConsentUpdateEvent(event) &&
              categories.every((category) => preferences?.[category])
            );
          }

          return true;
        })
      );
    }
  };

  private isDestinationPlugin(plugin: Plugin): plugin is DestinationPlugin {
    return plugin.type === PluginType.destination;
  }

  private containsConsentSettings = (
    settings: IntegrationSettings | undefined
  ): settings is Required<Pick<SegmentAPIIntegration, 'consentSettings'>> => {
    return (
      typeof (settings as SegmentAPIIntegration)?.consentSettings
        ?.categories === 'object'
    );
  };

  private isConsentUpdateEvent(event: SegmentEvent): boolean {
    return (event as TrackEventType).event === CONSENT_PREF_UPDATE_EVENT;
  }

  private hasUnmappedDestinations(): boolean {
    return (
      this.analytics?.consentSettings.get()?.hasUnmappedDestinations === true
    );
  }

  private isConsentFeatureSetup(): boolean {
    return typeof this.analytics?.consentSettings.get() === 'object';
  }

  private notifyConsentChange() {
    // actual preferences will be attached in the execute method
    this.analytics?.track(CONSENT_PREF_UPDATE_EVENT).catch((e) => {
      throw e;
    });
  }
}

/**
 * This plugin reads the consent metadata set on the context object and then drops the events
 * if they are going into a destination which violates's set consent preferences
 */
class ConsentFilterPlugin extends Plugin {
  type = PluginType.before;
  private shouldAllowEvent: (event: SegmentEvent) => boolean;

  constructor(shouldAllowEvent: (event: SegmentEvent) => boolean) {
    super();
    this.shouldAllowEvent = shouldAllowEvent;
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    return this.shouldAllowEvent(event) ? event : undefined;
  }
}
