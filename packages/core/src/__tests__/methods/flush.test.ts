import { SegmentClient } from '../../analytics';
import {
  getMockLogger,
  getMockTimeline,
  MockSegmentStore,
} from '../../test-helpers';
import { PluginType } from '../../types';

import type { DestinationPlugin } from '../../plugin';
jest.mock('react-native');
jest.mock('uuid');

describe('methods #flush', () => {
  const store = new MockSegmentStore();

  const clientArgs = {
    config: {
      writeKey: '123-456',
      autoAddSegmentDestination: false,
      trackAppLifecycleEvents: false,
      flushInterval: 0,
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('does not flush plugins when the client is destroyed', async () => {
    const client = new SegmentClient(clientArgs);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    client.timeline = getMockTimeline();
    client.cleanup();

    await client.flush();

    const destinations = client.getPlugins(PluginType.destination);
    const mockDestinationPlugin = destinations[0] as DestinationPlugin;
    expect(mockDestinationPlugin.flush).not.toHaveBeenCalled();
  });

  it('calls flush on the plugins correctly', async () => {
    const client = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        userInfo: {
          anonymousId: '123-456',
          traits: {
            name: 'Mary',
          },
        },
      }),
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    client.timeline = getMockTimeline();

    const destinations = client.getPlugins(PluginType.destination);
    const mockDestinationPlugin = destinations[0] as DestinationPlugin;

    await client.flush();

    expect(mockDestinationPlugin.flush).toHaveBeenCalledTimes(1);
  });

  // it('handles errors in posting an event', async () => {
  //   const state = {
  //     events: [
  //       { messageId: 'message-1' },
  //       { messageId: 'message-2' },
  //     ] as SegmentEvent[],
  //     eventsToRetry: [] as SegmentEvent[],
  //     userTraits: {
  //       name: 'Mary',
  //     },
  //   };
  //   const clientContext = {
  //     key: 'segment-key',
  //     config: { maxBatchSize: 2 },
  //     secondsElapsed: 10,
  //     logger: getMockLogger(),
  //     store: {
  //       dispatch: jest.fn() as jest.MockedFunction<any>,
  //       getState: () => state,
  //     },
  //     actions: {
  //       deleteEventsByMessageId: jest.fn() as jest.MockedFunction<any>,
  //       addEventsToRetry: jest.fn() as jest.MockedFunction<any>,
  //     },
  //     timeline: getMockTimeline(),
  //   } as SegmentClientContext;

  //   const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockRejectedValue(null);

  //   await flush.bind(clientContext)();

  //   expect(sendEventsSpy).toHaveBeenCalledTimes(1);
  //   expect(clientContext.store.dispatch).toHaveBeenCalledTimes(2);
  //   expect(clientContext.actions.main.deleteEventsByMessageId).toHaveBeenCalledTimes(
  //     1
  //   );
  //   expect(clientContext.actions.main.deleteEventsByMessageId).toHaveBeenCalledWith({
  //     ids: ['message-1', 'message-2'],
  //   });
  //   expect(clientContext.actions.main.addEventsToRetry).toHaveBeenCalledTimes(1);
  //   expect(clientContext.actions.main.addEventsToRetry).toHaveBeenCalledWith({
  //     events: state.events,
  //     config: clientContext.config,
  //   });
  // });
});
