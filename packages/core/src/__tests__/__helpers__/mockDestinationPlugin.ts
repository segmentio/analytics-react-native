import { DestinationPlugin } from '../../plugin';

export const getMockDestinationPlugin = () => {
  const destinationPlugin = new DestinationPlugin();
  destinationPlugin.flush = jest.fn() as jest.MockedFunction<any>;
  return destinationPlugin;
};
