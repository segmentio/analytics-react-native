import { Timeline } from '../../core/src/timeline';
import { getMockDestinationPlugin } from './mockDestinationPlugin';
import { DestinationPlugin } from '../../core/src/plugin';

export const getMockTimeline = () => {
  const timeline = new Timeline();
  const destinationPlugin: DestinationPlugin = getMockDestinationPlugin();
  timeline.add(destinationPlugin);
  return timeline;
};
