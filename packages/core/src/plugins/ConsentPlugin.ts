import {
  Plugin,
  type SegmentClient,
  type DestinationPlugin,
  IntegrationSettings,
  PluginType,
  SegmentAPIIntegration,
  SegmentEvent,
  TrackEventType,
} from '..';

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

  constructor(
    private consentCategoryProvider: CategoryConsentStatusProvider,
    private categories: string[]
  ) {
    super();
  }

  configure(analytics: SegmentClient): void {
    super.configure(analytics);
    analytics.getPlugins().forEach(this.injectConsentFilterIfApplicable);
    analytics.onPluginLoaded(this.injectConsentFilterIfApplicable);
    this.consentCategoryProvider.setApplicableCategories(this.categories);
    this.consentCategoryProvider.onConsentChange((categoryPreferences) => {
      this.analytics
        ?.track(CONSENT_PREF_UPDATE_EVENT, {
          consent: {
            categoryPreferences,
          },
        })
        .catch((e) => {
          throw e;
        });
    });
  }

  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    if ((event as TrackEventType).event === CONSENT_PREF_UPDATE_EVENT) {
      return event;
    }

    (event.context ??= {}).consent = {
      categoryPreferences:
        await this.consentCategoryProvider.getConsentStatus(),
    };

    return event;
  }

  shutdown(): void {
    this.consentCategoryProvider.shutdown?.();
  }

  private injectConsentFilterIfApplicable = (plugin: Plugin) => {
    if (
      this.isDestinationPlugin(plugin) &&
      plugin.key !== SEGMENT_DESTINATION_KEY
    ) {
      const settings = this.analytics?.settings.get()?.[plugin.key];

      plugin.add(
        new ConsentFilterPlugin(
          this.containsConsentSettings(settings)
            ? settings.consentSettings.categories
            : []
        )
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
}

/**
 * This plugin reads the consent metadata set on the context object and then drops the events
 * if they are going into a destination which violates's set consent preferences
 */
class ConsentFilterPlugin extends Plugin {
  type = PluginType.before;

  constructor(private categories: string[]) {
    super();
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    const preferences = event.context?.consent?.categoryPreferences;

    // if consent plugin is active but the setup isn't properly configured - events are blocked by default
    if (!preferences || this.categories.length === 0) {
      return undefined;
    }

    // all categories this destination is tagged with must be present, and allowed in consent preferences
    return this.categories.every((category) => preferences?.[category])
      ? event
      : undefined;
  }
}
