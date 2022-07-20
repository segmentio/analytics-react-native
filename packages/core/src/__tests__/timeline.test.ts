import { SegmentClient } from '../analytics';
import { Plugin } from '../plugin';
import { Timeline } from '../timeline';
import { EventType, PluginType, SegmentEvent, TrackEventType } from '../types';
import { getMockLogger } from './__helpers__/mockLogger';
import { MockSegmentStore } from './__helpers__/mockSegmentStore';

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('timeline', () => {
  const initialUserInfo = {
    traits: {
      name: 'Stacy',
      age: 30,
    },
    userId: 'current-user-id',
    anonymousId: 'very-anonymous',
  };

  const store = new MockSegmentStore({
    userInfo: initialUserInfo,
    settings: {
      '1': true,
      '2': true,
    },
  });

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
    },
    logger: getMockLogger(),
    store: store,
  };

  const client = new SegmentClient(clientArgs);

  class MockPlugin extends Plugin {
    constructor(
      private readonly executeFunc: (
        event: SegmentEvent
      ) => SegmentEvent | undefined,
      type: PluginType
    ) {
      super();
      this.type = type;
      this.analytics = client;
    }

    execute(event: SegmentEvent) {
      return this.executeFunc(event);
    }
  }

  it('processes each destination independently', async () => {
    const timeline = new Timeline();

    const goodPlugin = jest.fn().mockImplementation((e) => e);
    const badPlugin = jest.fn().mockImplementation(() => undefined);
    timeline.add(new MockPlugin(badPlugin, PluginType.destination));
    timeline.add(new MockPlugin(goodPlugin, PluginType.destination));

    const expectedEvent: TrackEventType = {
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'sample',
      },
    };

    const result = await timeline.process(expectedEvent);

    expect(result).toEqual(expectedEvent);
    expect(goodPlugin).toHaveBeenCalled();
    expect(badPlugin).toHaveBeenCalled();
  });

  it('handles errors from plugins execution', async () => {
    const timeline = new Timeline();

    const goodPlugin = jest.fn().mockImplementation((e) => e);
    const badPlugin = jest.fn().mockImplementation(() => {
      throw 'ERROR';
    });
    timeline.add(new MockPlugin(badPlugin, PluginType.before));
    timeline.add(new MockPlugin(goodPlugin, PluginType.before));

    const expectedEvent: TrackEventType = {
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'sample',
      },
    };

    const result = await timeline.process(expectedEvent);

    expect(result).toEqual(expectedEvent);
    expect(goodPlugin).toHaveBeenCalled();
    expect(badPlugin).toHaveBeenCalled();
  });

  it('shortcircuits plugin execution if a plugin return undefined', async () => {
    const timeline = new Timeline();

    const goodPlugin = jest.fn().mockImplementation((e) => e);
    const badPlugin = jest.fn().mockImplementation(() => undefined);
    timeline.add(new MockPlugin(badPlugin, PluginType.before));
    timeline.add(new MockPlugin(goodPlugin, PluginType.before));
    timeline.add(new MockPlugin(goodPlugin, PluginType.destination));

    const expectedEvent: TrackEventType = {
      type: EventType.TrackEvent,
      event: 'test',
      properties: {
        test: 'sample',
      },
    };

    const result = await timeline.process(expectedEvent);

    expect(result).toEqual(undefined);
    expect(goodPlugin).not.toHaveBeenCalled();
    expect(badPlugin).toHaveBeenCalled();
  });
});
