import {
  DestinationPlugin,
  isObject,
  Plugin,
  PluginType,
  RoutingRule,
  SegmentClient,
  SegmentEvent,
  UtilityPlugin,
} from '@segment/analytics-react-native';
import { Unsubscribe } from '@segment/analytics-react-native';
import * as tsub from '@segment/tsub';
import clone from 'clone';

const WORKSPACE_DESTINATION_FILTER_KEY = '';

/**
 * Adds processing for Destination Filters
 * (https://segment.com/docs/connections/destinations/destination-filters/)
 * to work on device mode destinations
 */
export class DestinationFiltersPlugin extends UtilityPlugin {
  type = PluginType.before;

  private key?: string;
  private filtersUnsubscribe?: Unsubscribe;
  private filter?: RoutingRule;
  constructor(destination?: string) {
    super();
    this.key = destination;
  }

  private addToPlugin = (plugin: Plugin) => {
    if (plugin.type === PluginType.destination) {
      const destination: DestinationPlugin = plugin as DestinationPlugin;
      destination.add(new DestinationFiltersPlugin(destination.key));
    }
  };

  override configure(analytics: SegmentClient) {
    super.configure(analytics);

    if (this.key === undefined) {
      // We watch for new destination plugins being added to inject a
      // destination filter instance for them
      analytics.onPluginLoaded(this.addToPlugin);
      // We also inject an instance for each plugin already loaded
      analytics.getPlugins(PluginType.destination).forEach(this.addToPlugin);
    }

    const key = this.key ?? WORKSPACE_DESTINATION_FILTER_KEY;

    this.filter = analytics.filters.get()?.[key];

    this.filtersUnsubscribe?.();
    this.filtersUnsubscribe = analytics.filters.onChange((filters) => {
      this.filter = filters?.[key];
    });
  }

  execute(event: SegmentEvent) {
    if (this.filter === undefined) {
      return event;
    }

    const { matchers, transformers } = this.filter;
    let transformedEvent: SegmentEvent | undefined;
    for (let i = 0; i < matchers.length; i++) {
      if (tsub.matches(event, matchers[i])) {
        // We have to deep clone the event as the tsub transform modifies the event in place
        if (transformedEvent === undefined) {
          transformedEvent = clone(event);
        }
        const newEvent: unknown = tsub.transform(
          transformedEvent,
          transformers[i]
        );
        if (
          newEvent === undefined ||
          newEvent === null ||
          !isObject(newEvent)
        ) {
          return undefined;
        }
        transformedEvent = newEvent as unknown as SegmentEvent;
      }
    }
    return transformedEvent ?? event;
  }
}
