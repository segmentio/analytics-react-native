import { EventType, SegmentEvent } from '../../types';
import { createTestClient } from '../__helpers__/setupSegmentClient';

jest.mock('../../uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('methods #alias', () => {
  const initialUserInfo = {
    anonymousId: 'anonymousId',
    userId: 'current-user-id',
  };

  const { store, client, expectEvent } = createTestClient({
    userInfo: initialUserInfo,
  });

  beforeEach(async () => {
    store.reset();
    jest.clearAllMocks();
    await client.init();
  });

  it('adds the alias event correctly', async () => {
    await client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'current-user-id',
      type: EventType.AliasEvent,
      userId: 'new-user-id',
    };

    expectEvent(expectedEvent);

    const info = await client.userInfo.get(true);
    expect(info).toEqual({
      anonymousId: 'anonymousId',
      userId: 'new-user-id',
      traits: undefined,
    });
  });

  it('uses anonymousId in event if no userId in store', async () => {
    await client.init();

    await store.userInfo.set({
      anonymousId: 'anonymousId',
      userId: undefined,
    });

    await client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'anonymousId',
      type: EventType.AliasEvent,
      userId: 'new-user-id',
    };

    expectEvent(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      anonymousId: 'anonymousId',
      userId: 'new-user-id',
      traits: undefined,
    });
  });

  it('is concurrency safe', async () => {
    // We trigger an alias and do not await it, we do a track immediately and await.
    // The track call should have the correct values injected into it.
    client.alias('new-user-id');
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
