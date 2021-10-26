import type { SegmentClientContext } from '../../client';
import flush from '../../methods/flush';
import { getMockLogger } from '../__helpers__/mockLogger';
// import * as api from '../../api';
import { PluginType, SegmentEvent } from '../../types';
import { getMockTimeline } from '../__helpers__/mockTimeline';
import type { DestinationPlugin } from '../../plugin';

describe('methods #flush', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not send any events when the client is destroyed', async () => {
    const clientContext = {
      destroyed: true,
      secondsElapsed: 10,
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            events: [
              { messageId: 'message-1' },
              { messageId: 'message-2' },
              { messageId: 'message-3' },
              { messageId: 'message-4' },
            ] as SegmentEvent[],
          },
        }),
      },
      timeline: getMockTimeline(),
    } as SegmentClientContext;

    await flush.bind(clientContext)();

    const mockDestinationPlugin = (
      clientContext.timeline.plugins[
        PluginType.destination
      ] as DestinationPlugin[]
    )[0];
    expect(mockDestinationPlugin.flush).not.toHaveBeenCalled();
  });

  it('sets secondsElapsed to 0 ', async () => {
    const clientContext = {
      secondsElapsed: 10,
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            events: [] as SegmentEvent[],
          },
        }),
      },
      timeline: getMockTimeline(),
    } as SegmentClientContext;

    await flush.bind(clientContext)();

    expect(clientContext.secondsElapsed).toBe(0);
  });

  it('does not dispatch any actions when there are no events to be sent', async () => {
    const clientContext = {
      secondsElapsed: 10,
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          main: {
            events: [] as SegmentEvent[],
          },
        }),
      },
      timeline: getMockTimeline(),
    } as SegmentClientContext;

    await flush.bind(clientContext)();

    const mockDestinationPlugin = (
      clientContext.timeline.plugins[
        PluginType.destination
      ] as DestinationPlugin[]
    )[0];
    expect(mockDestinationPlugin.flush).not.toHaveBeenCalled();
  });

  it('sends the events correctly', async () => {
    const state = {
      userInfo: {
        anonymousId: '123-456',
        traits: {
          name: 'Mary',
        },
      },
      main: {
        events: [
          { messageId: 'message-1' },
          { messageId: 'message-2' },
        ] as SegmentEvent[],
        eventsToRetry: [] as SegmentEvent[],
      },
      system: {
        settings: {},
      },
    };
    const clientContext = {
      config: {
        writeKey: 'segment-key',
        maxBatchSize: 10,
      },
      secondsElapsed: 10,
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => state,
      },
      actions: {
        main: {
          deleteEventsByMessageId: jest.fn() as jest.MockedFunction<any>,
        },
      },
      timeline: getMockTimeline(),
    } as SegmentClientContext;

    const mockDestinationPlugin = (
      clientContext.timeline.plugins[
        PluginType.destination
      ] as DestinationPlugin[]
    )[0];
    const pluginFlushSpy = jest.spyOn(mockDestinationPlugin, 'flush');

    await flush.bind(clientContext)();

    expect(pluginFlushSpy).toHaveBeenCalledTimes(1);
  });

  // it('chunks the events correctly', async () => {
  //   const state = {
  //     anonymousId: '123-456',
  //     events: [
  //       { messageId: 'message-1' },
  //       { messageId: 'message-2' },
  //       { messageId: 'message-3' },
  //       { messageId: 'message-4' },
  //     ] as SegmentEvent[],
  //     eventsToRetry: [] as SegmentEvent[],
  //     userTraits: {
  //       name: 'Mary',
  //     },
  //     settings: {},
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
  //     },
  //     timeline: getMockTimeline(),
  //   } as SegmentClientContext;

  //   const sendEventsSpy = jest.spyOn(api, 'sendEvents').mockResolvedValue();

  //   await flush.bind(clientContext)();

  //   expect(sendEventsSpy).toHaveBeenCalledTimes(2);
  //   expect(sendEventsSpy).toHaveBeenCalledWith({
  //     config: {
  //       maxBatchSize: 2,
  //     },
  //     events: [state.events[0], state.events[1]],
  //     writeKey: 'segment-key',
  //     traits: state.userTraits,
  //   });

  //   expect(clientContext.store.dispatch).toHaveBeenCalledTimes(1);

  //   expect(clientContext.actions.main.deleteEventsByMessageId).toHaveBeenCalledTimes(
  //     1
  //   );
  //   expect(clientContext.actions.main.deleteEventsByMessageId).toHaveBeenCalledWith({
  //     ids: ['message-1', 'message-2', 'message-3', 'message-4'],
  //   });

  //   expect(sendEventsSpy).toHaveBeenCalledWith({
  //     config: {
  //       maxBatchSize: 2,
  //     },
  //     events: [state.events[2], state.events[3]],
  //     writeKey: 'segment-key',
  //     traits: state.userTraits,
  //   });
  //   expect(clientContext.logger.warn).toHaveBeenCalledTimes(1);
  //   expect(clientContext.logger.warn).toHaveBeenCalledWith('Sent 4 events');
  // });

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
