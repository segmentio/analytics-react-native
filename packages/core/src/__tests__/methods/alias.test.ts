import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import { mockPersistor } from '../__helpers__/mockPersistor';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

const defaultClientConfig = {
  config: {
    writeKey: 'mock-write-key',
  },
  logger: getMockLogger(),
  store: {
    dispatch: jest.fn() as jest.MockedFunction<any>,
    getState: () => ({
      userInfo: {
        userId: 'current-user-id',
        anonymousId: 'very-anonymous',
      },
    }),
  },
  persistor: mockPersistor,
  actions: {
    userInfo: {
      setUserId: ({ userId }: { userId: string }) =>
        `action with ${userId}` as jest.MockedFunction<any>,
    },
  },
};

describe('methods #alias', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
    jest.clearAllMocks();
  });

  it('adds the alias event correctly', () => {
    const client = new SegmentClient(defaultClientConfig);
    jest.spyOn(client, 'process');

    client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'current-user-id',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    // @ts-ignore
    expect(client.store.dispatch).not.toHaveBeenCalled();

    expect(client.logger.info).toHaveBeenCalledTimes(1);
    expect(client.logger.info).toHaveBeenCalledWith(
      'ALIAS event saved',
      expectedEvent
    );
  });

  it('uses anonymousId in event if no userId in store', () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            anonymousId: 'very-anonymous',
          },
        }),
      },
    });
    jest.spyOn(client, 'process');

    client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'very-anonymous',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    // @ts-ignore
    expect(client.store.dispatch).not.toHaveBeenCalled();

    expect(client.logger.info).toHaveBeenCalledTimes(1);
    expect(client.logger.info).toHaveBeenCalledWith(
      'ALIAS event saved',
      expectedEvent
    );
  });
});
