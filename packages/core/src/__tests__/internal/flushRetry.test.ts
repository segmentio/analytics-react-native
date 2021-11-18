import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import * as api from '../../api';
import type { SegmentEvent } from '../../types';
import { mockPersistor } from '../__helpers__/mockPersistor';

const defaultClientConfig = {
  config: {
    writeKey: 'mock-write-key',
    maxBatchSize: 10,
  },
  logger: getMockLogger(),
  store: {
    dispatch: jest.fn() as jest.MockedFunction<any>,
    getState: () => ({
      main: {
        events: [] as SegmentEvent[],
        eventsToRetry: [
          { messageId: 'message-1' },
          { messageId: 'message-2' },
        ] as SegmentEvent[],
      },
    }),
  },
  persistor: mockPersistor,
  actions: {},
};

describe('internal #flushRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers('legacy');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('does not send any events when the client is destroyed ', async () => {
    const client = new SegmentClient(defaultClientConfig);
    client.cleanup();

    const sendEventsSpy = jest.spyOn(api, 'sendEvents');
    await client.flushRetry();
    jest.runAllTimers();

    expect(sendEventsSpy).not.toHaveBeenCalled();
  });

  it('does not send any events when there are no eventsToRetry in the state ', async () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            events: [] as SegmentEvent[],
            eventsToRetry: [] as SegmentEvent[],
          },
        }),
      },
    });

    const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();

    await client.flushRetry();

    expect(sendEventsSpy).not.toHaveBeenCalled();
  });

  // it('does not send any events when theres already another flushRetry in the queue', async () => {
  //   const client = new SegmentClient(defaultClientConfig);

  //   const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();

  //   await Promise.all([client.flushRetry(), client.flushRetry()]);
  //   jest.runAllTimers();

  //   expect(sendEventsSpy).toHaveBeenCalledTimes(1);
  // });

  // it('sends the events correctly', async () => {
  //   const state = {
  //     userInfo: {
  //       anonymousId: '123-456',
  //       traits: {
  //         name: 'Mary',
  //       },
  //     },
  //     main: {
  //       events: [] as SegmentEvent[],
  //       eventsToRetry: [
  //         { messageId: 'message-1' },
  //         { messageId: 'message-2' },
  //       ] as SegmentEvent[],
  //     },
  //     system: {
  //       settings: {},
  //     },
  //   };

  //   const deleteEventsMock = jest.fn() as jest.MockedFunction<any>;

  //   const client = new SegmentClient({
  //     ...defaultClientConfig,
  //     store: {
  //       dispatch: jest.fn() as jest.MockedFunction<any>,
  //       getState: () => state,
  //     },
  //     actions: {
  //       main: {
  //         deleteEventsToRetryByMessageId: deleteEventsMock,
  //       },
  //     },
  //   });

  //   const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();
  //   await client.flushRetry();
  //   jest.runAllTimers();

  //   expect(sendEventsSpy).toHaveBeenCalledTimes(1);
  //   expect(sendEventsSpy).toHaveBeenCalledWith({
  //     config: defaultClientConfig.config,
  //     events: state.main.eventsToRetry,
  //   });
  //   expect(deleteEventsMock).toHaveBeenCalledWith({
  //     ids: ['message-1', 'message-2'],
  //   });
  //   expect(client.logger.warn).toHaveBeenCalledWith(
  //     'Sent 2 events (via retry)'
  //   );
  //   // @ts-ignore
  //   expect(client.refreshTimeout).toBe(null);
  // });

  // it('batches events correctly', async () => {
  //   const state = {
  //     userInfo: {
  //       anonymousId: '123-456',
  //       traits: {
  //         name: 'Mary',
  //       },
  //     },
  //     main: {
  //       events: [] as SegmentEvent[],
  //       eventsToRetry: [
  //         { messageId: 'message-1' },
  //         { messageId: 'message-2' },
  //         { messageId: 'message-3' },
  //         { messageId: 'message-4' },
  //       ] as SegmentEvent[],
  //     },
  //     system: {
  //       settings: {},
  //     },
  //   };
  //   const timeout = jest.fn() as jest.MockedFunction<any>;
  //   const clientContext = {
  //     config: {
  //       writeKey: 'segment-key',
  //       maxBatchSize: 2,
  //     },
  //     refreshTimeout: timeout,
  //     secondsElapsed: 10,
  //     logger: getMockLogger(),
  //     store: {
  //       dispatch: jest.fn() as jest.MockedFunction<any>,
  //       getState: () => state,
  //     },
  //     actions: {
  //       main: {
  //         deleteEventsToRetryByMessageId: jest.fn() as jest.MockedFunction<any>,
  //       },
  //     },
  //   } as SegmentClientContext;

  //   const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();
  //   await flushRetry.bind(clientContext)();

  //   expect(sendEventsSpy).toHaveBeenCalledTimes(2);
  //   expect(sendEventsSpy).toHaveBeenCalledWith({
  //     config: clientContext.config,
  //     events: [state.main.eventsToRetry[0], state.main.eventsToRetry[1]],
  //   });
  //   expect(sendEventsSpy).toHaveBeenCalledWith({
  //     config: clientContext.config,
  //     events: [state.main.eventsToRetry[2], state.main.eventsToRetry[3]],
  //   });
  //   expect(
  //     clientContext.actions.main.deleteEventsToRetryByMessageId
  //   ).toHaveBeenCalledWith({
  //     ids: ['message-1', 'message-2'],
  //   });
  //   expect(
  //     clientContext.actions.main.deleteEventsToRetryByMessageId
  //   ).toHaveBeenCalledWith({
  //     ids: ['message-3', 'message-4'],
  //   });
  //   expect(clientContext.logger.warn).toHaveBeenCalledWith(
  //     'Sent 4 events (via retry)'
  //   );
  //   expect(clientContext.refreshTimeout).toBe(null);
  // });

  // ONLY WORKS WHEN RUN IN ISOLATION (?)

  // it('handles errors in posting an event', async () => {
  //   const state = {
  //     main: {
  //       events: [] as SegmentEvent[],
  //       eventsToRetry: [
  //         { messageId: 'message-1' },
  //         { messageId: 'message-2' },
  //       ] as SegmentEvent[],
  //     },
  //     userInfo: {
  //       traits: {
  //         name: 'Mary',
  //       },
  //     },
  //   };
  //   const timeout = jest.fn() as jest.MockedFunction<any>;
  //   const clientContext = {
  //     config: {
  //       writeKey: 'segment-key',
  //       maxBatchSize: 2,
  //       retryInterval: 40,
  //     },
  //     refreshTimeout: timeout,
  //     secondsElapsed: 10,
  //     logger: getMockLogger(),
  //     store: {
  //       dispatch: jest.fn() as jest.MockedFunction<any>,
  //       getState: () => state,
  //     },
  //     actions: {
  //       main: {
  //         deleteEventsToRetryByMessageId: jest.fn() as jest.MockedFunction<any>,
  //       },
  //     },
  //   } as SegmentClientContext;

  //   await flushRetry.bind(clientContext)();
  //   expect(setTimeout).toHaveBeenCalledTimes(1);
  //   expect(setTimeout).toHaveBeenCalledWith(
  //     expect.any(Function),
  //     clientContext.config.retryInterval! * 1000
  //   );
  //   expect(clientContext.logger.error).toHaveBeenCalledWith(
  //     'Failed to send 2 events. Retrying in 40 seconds (via retry)'
  //   );
  // });
});
