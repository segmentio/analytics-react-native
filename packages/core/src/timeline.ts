import { PluginType, SegmentEvent, UpdateType } from './types';
import type { Plugin } from './plugin';
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

  process(incomingEvent: SegmentEvent) {
    // apply .before and .enrichment types first ...
    const beforeResult = this.applyPlugins({
      type: PluginType.before,
      event: incomingEvent,
    });

    if (beforeResult === undefined) {
      return;
    }
    // .enrichment here is akin to source middleware in the old analytics-ios.
    const enrichmentResult = this.applyPlugins({
      type: PluginType.enrichment,
      event: beforeResult,
    });

    // once the event enters a destination, we don't want
    // to know about changes that happen there. those changes
    // are to only be received by the destination.
    this.applyPlugins({
      type: PluginType.destination,
      event: enrichmentResult,
    });

    // apply .after plugins ...
    let afterResult = this.applyPlugins({
      type: PluginType.after,
      event: enrichmentResult,
    });

    return afterResult;
  }

  applyPlugins({ type, event }: { type: PluginType; event: SegmentEvent }) {
    let result: SegmentEvent | undefined = event;

    const plugins = this.plugins[type];
    if (plugins) {
      plugins.forEach((plugin) => {
        if (result) {
          result = plugin.execute(result);
        }
      });
    }
    return result;
  }
}
