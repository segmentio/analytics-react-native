import { EventType, SegmentEvent } from '../../types';
import { createTestClient } from '../__helpers__/setupSegmentClient';

describe('methods #identify', () => {
  const initialUserInfo = {
    traits: {
      name: 'Stacy',
      age: 30,
    },
    userId: 'current-user-id',
    anonymousId: 'very-anonymous',
  };
  const { store, client, expectEvent } = createTestClient({
    userInfo: initialUserInfo,
  });

  beforeEach(async () => {
    store.reset();
    jest.clearAllMocks();
    await client.init();
  });

  it('adds the identify event correctly', async () => {
    await client.identify('new-user-id', { name: 'Mary', age: 30 });

    const expectedEvent: Partial<SegmentEvent> = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      userId: 'new-user-id',
      type: EventType.IdentifyEvent,
    };

    expectEvent(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
      traits: expectedEvent.traits,
    });
  });

  it('does not update user traits when there are no new ones provided', async () => {
    await client.identify('new-user-id');

    const expectedEvent = {
      traits: initialUserInfo.traits,
      userId: 'new-user-id',
      type: EventType.IdentifyEvent,
    };

    expectEvent(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
    });
  });

  it('does not update userId when userId is undefined', async () => {
    await client.identify(undefined, { name: 'Mary' });

    const expectedEvent = {
      traits: { name: 'Mary', age: 30 },
      userId: 'current-user-id',
      type: EventType.IdentifyEvent,
    };

    expectEvent(expectedEvent);
    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      traits: {
        age: 30,
        name: 'Mary',
      },
    });
  });

  it.only('does not persist identity traits accross events', async () => {
    await client.identify('new-user-id', { name: 'Mary', age: 30 });

    const expectedEvent: Partial<SegmentEvent> = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      userId: 'new-user-id',
      type: EventType.IdentifyEvent,
    };
    expectEvent(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
      traits: expectedEvent.traits,
    });

    await client.track('track event');

    expectEvent({
      anonymousId: 'very-anonymous',
      event: 'track event',
      integrations: {},
      messageId: 'mocked-uuid',
      properties: {},
      timestamp: '2010-01-01T00:00:00.000Z',
      type: EventType.TrackEvent,
      userId: 'new-user-id',
    });
  });

  it('adds userInfo to next events, concurrency safe', async () => {
    // We trigger an identify and do not await it, we do a track immediately and await.
    // The track call should have the correct values injected into it.
    void client.identify('new-user-id');
    await client.track('something');

    const expectedTrackEvent: Partial<SegmentEvent> = {
      event: 'something',
      userId: 'new-user-id',
      type: EventType.TrackEvent,
    };

    expectEvent(expectedTrackEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
    });
  });
});
