import { DestinationPlugin, UtilityPlugin } from '../plugin';
import { PluginType, SegmentEvent } from '../types';
import { SEGMENT_DESTINATION_KEY } from './SegmentDestination';

export class DestinationMetadataEnrichment extends UtilityPlugin {
  type = PluginType.enrichment;

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
      if (key === SEGMENT_DESTINATION_KEY) {
        continue;
      }

      if (key in pluginSettings) {
        bundled.push(key);
      }
    }

    const unbundled: string[] = [];
    const segmentInfo =
      (pluginSettings[SEGMENT_DESTINATION_KEY] as Record<string, any>) ?? {};
    const unbundledIntegrations: string[] =
      segmentInfo.unbundledIntegrations ?? [];

    for (const integration of unbundledIntegrations) {
      if (!(integration in bundled)) {
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
