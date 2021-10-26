import { Timeline } from '../../timeline';
import { getMockDestinationPlugin } from './mockDestinationPlugin';

export const getMockTimeline = () => {
  const timeline = new Timeline();
  const destinationPlugin = getMockDestinationPlugin();
  timeline.add(destinationPlugin);
  return timeline;
};
