import type { SegmentClientContext } from '../../client';
import identify from '../../methods/identify';
import type { UserTraits } from '../../types';
import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('methods #identify', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the identify event correctly', () => {
    const clientContext = {
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
      actions: {
        userInfo: {
          setUserId: jest
            .fn()
            .mockImplementation(
              ({ userId }: { userId: string }) =>
                `setUserId action with ${userId}`
            ) as jest.MockedFunction<any>,
          setTraits: jest
            .fn()
            .mockImplementation(
              ({ traits }: { traits: UserTraits }) =>
                `setTraits action with ${JSON.stringify(traits)}`
            ) as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;

    identify.bind(clientContext)({
      userId: 'new-user-id',
      userTraits: { name: 'Mary' },
    });

    const expectedEvent = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      type: 'identify',
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.store.dispatch).toHaveBeenCalledTimes(2);
    expect(clientContext.store.dispatch).toHaveBeenCalledWith(
      'setUserId action with new-user-id'
    );
    expect(clientContext.store.dispatch).toHaveBeenCalledWith(
      'setTraits action with {"name":"Mary"}'
    );

    expect(clientContext.actions.userInfo.setUserId).toHaveBeenCalledTimes(1);
    expect(clientContext.actions.userInfo.setUserId).toHaveBeenCalledWith({
      userId: 'new-user-id',
    });

    expect(clientContext.actions.userInfo.setTraits).toHaveBeenCalledTimes(1);
    expect(clientContext.actions.userInfo.setTraits).toHaveBeenCalledWith({
      traits: { name: 'Mary' },
    });

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'IDENTIFY event saved',
      expectedEvent
    );
  });

  it('does not update user traits when there are no new ones provided', () => {
    const clientContext = {
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
      actions: {
        userInfo: {
          setUserId: jest.fn() as jest.MockedFunction<any>,
          setTraits: jest.fn() as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;

    identify.bind(clientContext)({
      userId: 'new-user-id',
    });

    expect(clientContext.store.dispatch).toHaveBeenCalledTimes(1);
    expect(clientContext.actions.userInfo.setTraits).not.toHaveBeenCalled();
  });
});
