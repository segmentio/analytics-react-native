import { DestinationPlugin } from '../../core/src/plugin';

export const getMockDestinationPlugin: () => DestinationPlugin = () => {
  const destinationPlugin = new DestinationPlugin();
  destinationPlugin.flush = jest.fn() as jest.MockedFunction<never>;
  return destinationPlugin;
};
