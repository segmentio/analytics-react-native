import { createIdentifyEvent, createTrackEvent } from '../../events';
import { type SegmentEvent, EventType, UserTraits } from '../../types';
import { createTestClient } from '../../__tests__/__helpers__/setupSegmentClient';
import { InjectUserInfo } from '../InjectUserInfo';

describe('InjectContext', () => {
  const currentUserId = 'current-user-id';
  const anonymousId = 'very-anonymous';

  const initialUserInfo = {
    traits: {
      name: 'Stacy',
      age: 30,
    },
    userId: currentUserId,
    anonymousId: anonymousId,
  };
  const { store, client } = createTestClient({
    userInfo: initialUserInfo,
  });

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('adds userId and anonymousId to events', async () => {
    const expectedEvent: Partial<SegmentEvent> = {
      event: 'something',
      userId: currentUserId,
      anonymousId: anonymousId,
      type: EventType.TrackEvent,
    };

    const plugin = new InjectUserInfo();
    plugin.configure(client);
    const event = await plugin.execute(
      createTrackEvent({
        event: 'something',
      })
    );

    expect(event).toMatchObject(expectedEvent);
  });

  it('updates userId and traits on identify', async () => {
    const newUserId = 'new-user-id';
    const newTraits: UserTraits = {
      age: 30,
    };

    const expectedEvent: Partial<SegmentEvent> = {
      userId: newUserId,
      anonymousId: anonymousId,
      traits: newTraits,
      type: EventType.IdentifyEvent,
    };

    const plugin = new InjectUserInfo();
    plugin.configure(client);
    const event = await plugin.execute(
      createIdentifyEvent({
        userId: newUserId,
        userTraits: newTraits,
      })
    );

    expect(event).toMatchObject(expectedEvent);
    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
    });
  });

  it('is concurrency safe', async () => {
    const newUserId = 'new-user-id';
    const newTraits: UserTraits = {
      age: 30,
    };

    const expectedEvent: Partial<SegmentEvent> = {
      userId: newUserId,
      anonymousId: anonymousId,
      type: EventType.TrackEvent,
    };

    const plugin = new InjectUserInfo();
    plugin.configure(client);

    plugin.execute(
      createIdentifyEvent({
        userId: newUserId,
        userTraits: newTraits,
      })
    );

    const event = await plugin.execute(
      createTrackEvent({
        event: 'something',
      })
    );

    expect(event).toMatchObject(expectedEvent);
    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
    });
  });
});
