import { PluginType, SegmentEvent, UpdateType } from './types';
import type { DestinationPlugin, Plugin } from './plugin';
import { getAllPlugins } from './util';

/*
type TimelinePlugins = {
    before?: Plugin[] | undefined;
    enrichment?: Plugin[] | undefined;
    destination?: Plugin[] | undefined;
    after?: Plugin[] | undefined;
    utility?: Plugin[] | undefined;
}
 */
type TimelinePlugins = {
  [key in PluginType]?: Plugin[];
};

export class Timeline {
  plugins: TimelinePlugins = {};

  add(plugin: Plugin) {
    const { type } = plugin;
    if (this.plugins[type]) {
      this.plugins[type]?.push(plugin);
    } else {
      this.plugins[type] = [plugin];
    }
    const settings = plugin.analytics?.settings.get();
    let hasInitialSettings = false;
    if (settings !== undefined) {
      plugin.update({ integrations: settings }, UpdateType.initial);
      hasInitialSettings = true;
    }

    plugin.analytics?.settings.onChange((newSettings) => {
      if (newSettings !== undefined) {
        plugin.update(
          { integrations: newSettings },
          hasInitialSettings ? UpdateType.refresh : UpdateType.initial
        );
        hasInitialSettings = true;
      }
    });
  }

  remove(plugin: Plugin) {
    const plugins = this.plugins[plugin.type];
    if (plugins) {
      const index = plugins.findIndex((f) => f === plugin);
      if (index > -1) {
        plugins.splice(index, 1);
      }
    }
  }

  apply(closure: (plugin: Plugin) => void) {
    getAllPlugins(this).forEach((plugin) => closure(plugin));
  }

  async process(
    incomingEvent: SegmentEvent
  ): Promise<SegmentEvent | undefined> {
    // apply .before and .enrichment types first ...
    const beforeResult = await this.applyPlugins({
      type: PluginType.before,
      event: incomingEvent,
    });

    if (beforeResult === undefined) {
      return;
    }
    // .enrichment here is akin to source middleware in the old analytics-ios.
    const enrichmentResult = await this.applyPlugins({
      type: PluginType.enrichment,
      event: beforeResult,
    });

    if (enrichmentResult === undefined) {
      return;
    }

    // once the event enters a destination, we don't want
    // to know about changes that happen there. those changes
    // are to only be received by the destination.
    await this.applyPlugins({
      type: PluginType.destination,
      event: enrichmentResult,
    });

    // apply .after plugins ...
    let afterResult = await this.applyPlugins({
      type: PluginType.after,
      event: enrichmentResult,
    });

    return afterResult;
  }

  async applyPlugins({
    type,
    event,
  }: {
    type: PluginType;
    event: SegmentEvent;
  }): Promise<SegmentEvent | undefined> {
    let result: SegmentEvent | undefined = event;

    const plugins = this.plugins[type];
    if (plugins) {
      for (const plugin of plugins) {
        if (result) {
          try {
            const pluginResult = plugin.execute(result);
            // Each destination is independent from each other, so we don't roll over changes caused internally in each one of their processing
            if (type !== PluginType.destination) {
              result = await pluginResult;
            }
          } catch (error) {
            plugin.analytics?.logger.warn(
              `Destination ${
                (plugin as DestinationPlugin).key
              } failed to execute: ${JSON.stringify(error)}`
            );
          }
        }
      }
    }
    return result;
  }
}
