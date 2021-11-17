import { SegmentClient } from '../../analytics';
import type { UserTraits } from '../../types';
import { getMockLogger } from '../__helpers__/mockLogger';
import { mockPersistor } from '../__helpers__/mockPersistor';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

const defaultClientSettings = {
  config: {
    writeKey: 'mock-write-key',
  },
  logger: getMockLogger(),
  process: jest.fn() as jest.MockedFunction<any>,
  store: {
    dispatch: jest.fn() as jest.MockedFunction<any>,
    getState: () => ({
      userInfo: {
        traits: {
          name: 'Stacy',
          age: 30,
        },
        userId: 'current-user-id',
        anonymousId: 'very-anonymous',
      },
    }),
  },
  persistor: mockPersistor,
  actions: {
    userInfo: {
      setUserId: jest
        .fn()
        .mockImplementation(
          ({ userId }: { userId: string }) => `setUserId action with ${userId}`
        ) as jest.MockedFunction<any>,
      setTraits: jest
        .fn()
        .mockImplementation(
          ({ traits }: { traits: UserTraits }) =>
            `setTraits action with ${JSON.stringify(traits)}`
        ) as jest.MockedFunction<any>,
    },
  },
};

describe('methods #identify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the identify event correctly', () => {
    const client = new SegmentClient(defaultClientSettings);
    jest.spyOn(client, 'process');

    client.identify('new-user-id', { name: 'Mary' });

    const expectedEvent = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      type: 'identify',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledTimes(2);
    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledWith(
      'setUserId action with new-user-id'
    );
    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledWith(
      'setTraits action with {"name":"Mary"}'
    );

    // @ts-ignore
    expect(client.actions.userInfo.setUserId).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(client.actions.userInfo.setUserId).toHaveBeenCalledWith({
      userId: 'new-user-id',
    });

    // @ts-ignore
    expect(client.actions.userInfo.setTraits).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(client.actions.userInfo.setTraits).toHaveBeenCalledWith({
      traits: { name: 'Mary' },
    });

    expect(client.logger.info).toHaveBeenCalledTimes(1);
    expect(client.logger.info).toHaveBeenCalledWith(
      'IDENTIFY event saved',
      expectedEvent
    );
  });

  it('does not update user traits when there are no new ones provided', () => {
    const client = new SegmentClient(defaultClientSettings);
    jest.spyOn(client, 'process');

    client.identify('new-user-id');

    // @ts-ignore
    expect(client.store.dispatch).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(client.actions.userInfo.setTraits).not.toHaveBeenCalled();
  });
});
