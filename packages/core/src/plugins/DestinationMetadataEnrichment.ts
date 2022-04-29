import { DestinationPlugin, UtilityPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';

export class DestinationMetadataEnrichment extends UtilityPlugin {
  type = PluginType.enrichment;

  private destinationKey: string;

  constructor(destinationKey: string) {
    super();
    this.destinationKey = destinationKey;
  }

  execute(event: SegmentEvent): SegmentEvent {
    const pluginSettings = this.analytics?.settings.get();
    const plugins = this.analytics?.getPlugins(PluginType.destination);

    if (pluginSettings === undefined) {
      return event;
    }

    // Disable all destinations that have a device mode plugin
    const destinations =
      plugins?.map((plugin) => (plugin as DestinationPlugin).key) ?? [];
    const bundled: string[] = [];

    for (const key of destinations) {
      if (key === this.destinationKey) {
        continue;
      }

      if (Object.keys(pluginSettings).includes(key)) {
        bundled.push(key);
      }
    }

    const unbundled: string[] = [];
    const segmentInfo =
      (pluginSettings[this.destinationKey] as Record<string, any>) ?? {};
    const unbundledIntegrations: string[] =
      segmentInfo.unbundledIntegrations ?? [];

    for (const integration of unbundledIntegrations) {
      if (!bundled.includes(integration)) {
        unbundled.push(integration);
      }
    }

    // User/event defined integrations override the cloud/device mode merge
    const enrichedEvent: SegmentEvent = {
      ...event,
      _metadata: {
        bundled,
        unbundled,
        bundledIds: [],
      },
    };
    return enrichedEvent;
  }
}
