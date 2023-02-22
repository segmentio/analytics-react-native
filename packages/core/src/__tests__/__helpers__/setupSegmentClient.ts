import { SegmentClient } from '../../analytics';
import { UtilityPlugin } from '../../plugin';
import { Config, PluginType, SegmentEvent } from '../../types';
import { getMockLogger } from './mockLogger';
import { MockSegmentStore, StoreData } from './mockSegmentStore';

jest.mock('../../uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

export const createTestClient = (
  storeData?: Partial<StoreData>,
  config?: Partial<Config>
) => {
  const store = new MockSegmentStore({
    isReady: true,
    ...storeData,
  });

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
      autoAddSegmentDestination: false,
      ...config,
    },
    logger: getMockLogger(),
    store: store,
  };

  const client = new SegmentClient(clientArgs);
  class ObservablePlugin extends UtilityPlugin {
    type = PluginType.after;

    override execute(
      event: SegmentEvent
    ): SegmentEvent | Promise<SegmentEvent | undefined> | undefined {
      super.execute(event);
      return event;
    }
  }

  const mockPlugin = new ObservablePlugin();
  jest.spyOn(mockPlugin, 'execute');

  client.add({ plugin: mockPlugin });

  return {
    client,
    store,
    plugin: mockPlugin as UtilityPlugin,
    expectEvent: (event: Partial<SegmentEvent>) => {
      return expect(mockPlugin.execute).toHaveBeenCalledWith(
        expect.objectContaining(event)
      );
    },
  };
};
