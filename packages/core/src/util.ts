import type { EventPlugin } from './plugin';
import type { Timeline } from './timeline';

export const chunk = (array: any[], size: number) => {
  if (!array.length || !size) {
    return [];
  }

  let index = 0;
  let resIndex = 0;
  const result = new Array(Math.ceil(array.length / size));

  while (index < array.length) {
    result[resIndex++] = array.slice(index, (index += size));
  }
  return result;
};

export const getAllPlugins = (timeline: Timeline) => {
  const allPlugins = Object.values(timeline.plugins);
  if (allPlugins.length) {
    return allPlugins.reduce((prev = [], curr = []) => prev.concat(curr));
  }
  return [];
};

export const getPluginsWithFlush = (timeline: Timeline) => {
  if (!timeline) {
    return [];
  }

  const allPlugins = getAllPlugins(timeline);

  // checking for the existence of .flush()
  const eventPlugins = allPlugins?.filter(
    (f) => (f as EventPlugin).flush
  ) as EventPlugin[];

  return eventPlugins;
};

export const getPluginsWithReset = (timeline: Timeline) => {
  if (!timeline) {
    return [];
  }

  const allPlugins = getAllPlugins(timeline);

  // checking for the existence of .reset()
  const eventPlugins = allPlugins?.filter(
    (f) => (f as EventPlugin).reset
  ) as EventPlugin[];

  return eventPlugins;
};
