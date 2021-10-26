import type { SegmentClientContext } from '../../client';
import alias from '../../methods/alias';
import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('methods #alias', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the alias event correctly', () => {
    const clientContext = {
      logger: getMockLogger(),
      process: jest.fn() as jest.MockedFunction<any>,
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            userId: 'current-user-id',
            anonymousId: 'very-anonymous',
          },
        }),
      },
      actions: {
        userInfo: {
          setUserId: ({ userId }: { userId: string }) =>
            `action with ${userId}` as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;

    alias.bind(clientContext)({ newUserId: 'new-user-id' });

    const expectedEvent = {
      previousId: 'current-user-id',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.store.dispatch).not.toHaveBeenCalled();

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'ALIAS event saved',
      expectedEvent
    );
  });

  it('uses anonymousId in event if no userId in store', () => {
    const clientContext = {
      logger: getMockLogger(),
      process: jest.fn() as jest.MockedFunction<any>,
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
      actions: {
        userInfo: {
          setUserId: ({ userId }: { userId: string }) =>
            `action with ${userId}` as jest.MockedFunction<any>,
        },
      },
    } as SegmentClientContext;

    alias.bind(clientContext)({ newUserId: 'new-user-id' });

    const expectedEvent = {
      previousId: 'very-anonymous',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.store.dispatch).not.toHaveBeenCalled();

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'ALIAS event saved',
      expectedEvent
    );
  });
});
