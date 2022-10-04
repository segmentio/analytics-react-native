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
    const bundled = new Set<string>();

    for (const key of destinations) {
      if (key === this.destinationKey) {
        continue;
      }

      if (Object.keys(pluginSettings).includes(key)) {
        bundled.add(key);
      }
    }

    const unbundled = new Set<string>();
    const segmentInfo =
      (pluginSettings[this.destinationKey] as Record<string, any>) ?? {};
    var unbundledIntegrations: string[] =
      segmentInfo.unbundledIntegrations ?? [];

    // All active integrations, not in `bundled` are put in `unbundled`
    // All unbundledIntegrations not in `bundled` are put in `unbundled`
    for (const integration in segmentInfo) {
      if (integration !== this.destinationKey && !bundled.has(integration)) {
        unbundled.add(integration);
      }
    }
    for (const integration of unbundledIntegrations) {
      if (!bundled.has(integration)) {
        unbundled.add(integration);
      }
    }

    // User/event defined integrations override the cloud/device mode merge
    const enrichedEvent: SegmentEvent = {
      ...event,
      _metadata: {
        bundled: Array.from(bundled),
        unbundled: Array.from(unbundled),
        bundledIds: [],
      },
    };
    return enrichedEvent;
  }
}
