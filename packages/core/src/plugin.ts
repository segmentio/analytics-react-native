/* eslint-disable @typescript-eslint/no-unused-vars */

import type { SegmentClient } from './analytics';
import { Timeline } from './timeline';
import {
  AliasEventType,
  EventType,
  GroupEventType,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  SegmentAPISettings,
  SegmentEvent,
  TrackEventType,
  UpdateType,
} from './types';

export class Plugin {
  // default to utility to avoid automatic processing
  type: PluginType = PluginType.utility;
  analytics?: SegmentClient = undefined;

  configure(analytics: SegmentClient) {
    this.analytics = analytics;
  }

  // @ts-ignore
  update(settings: SegmentAPISettings, type: UpdateType) {
    // do nothing by default, user can override.
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    // do nothing.
    return event;
  }

  shutdown() {
    // do nothing by default, user can override.
  }
}

export class EventPlugin extends Plugin {
  execute(event: SegmentEvent): SegmentEvent | undefined {
    if (event === undefined) {
      return event;
    }
    let result = event;
    switch (result.type) {
      case EventType.IdentifyEvent:
        result = this.identify(result);
        break;
      case EventType.TrackEvent:
        result = this.track(result);
        break;
      case EventType.ScreenEvent:
        result = this.screen(result);
        break;
      case EventType.AliasEvent:
        result = this.alias(result);
        break;
      case EventType.GroupEvent:
        result = this.group(result);
        break;
    }
    return result;
  }

  // Default implementations that forward the event. This gives plugin
  // implementors the chance to interject on an event.
  identify(event: IdentifyEventType) {
    return event;
  }

  track(event: TrackEventType) {
    return event;
  }

  screen(event: ScreenEventType) {
    return event;
  }

  alias(event: AliasEventType) {
    return event;
  }

  group(event: GroupEventType) {
    return event;
  }

  flush() {}

  reset() {}
}

export class DestinationPlugin extends EventPlugin {
  // default to destination
  type = PluginType.destination;

  key = '';

  timeline = new Timeline();

  private hasSettings() {
    return this.analytics?.settings.get()?.[this.key] !== undefined;
  }

  private isEnabled(event: SegmentEvent): boolean {
    let customerDisabled = false;
    if (event.integrations?.[this.key] === false) {
      customerDisabled = true;
    }

    return this.hasSettings() && !customerDisabled;
  }

  /**
     Adds a new plugin to the currently loaded set.

     - Parameter plugin: The plugin to be added.
     - Returns: Returns the name of the supplied plugin.
  */
  add(plugin: Plugin) {
    const analytics = this.analytics;
    if (analytics) {
      plugin.configure(analytics);
    }
    this.timeline.add(plugin);
    return plugin;
  }

  /**
     Applies the supplied closure to the currently loaded set of plugins.

     - Parameter closure: A closure that takes an plugin to be operated on as a parameter.
  */
  apply(closure: (plugin: Plugin) => void) {
    this.timeline.apply(closure);
  }

  configure(analytics: SegmentClient) {
    this.analytics = analytics;
    this.apply((plugin) => {
      plugin.configure(analytics);
    });
  }

  /**
     Removes and unloads plugins with a matching name from the system.

     - Parameter pluginName: An plugin name.
  */
  remove(plugin: Plugin) {
    this.timeline.remove(plugin);
  }

  execute(event: SegmentEvent): SegmentEvent | undefined {
    if (!this.isEnabled(event)) {
      return undefined;
    }

    // Apply before and enrichment plugins
    const beforeResult = this.timeline.applyPlugins({
      type: PluginType.before,
      event,
    });

    if (beforeResult === undefined) {
      return;
    }

    const enrichmentResult = this.timeline.applyPlugins({
      type: PluginType.enrichment,
      event: beforeResult,
    });

    // Now send the event to the destination by executing the normal flow of an EventPlugin
    super.execute(enrichmentResult);

    // apply .after plugins
    let afterResult = this.timeline.applyPlugins({
      type: PluginType.after,
      event: enrichmentResult,
    });

    return afterResult;
  }
}

export class UtilityPlugin extends EventPlugin {}

// For internal platform-specific bits
export class PlatformPlugin extends Plugin {}
