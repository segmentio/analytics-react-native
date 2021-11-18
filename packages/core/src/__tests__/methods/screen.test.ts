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

describe('methods #screen', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the screen event correctly', () => {
    const client = new SegmentClient(defaultClientConfig);
    jest.spyOn(client, 'process');

    client.screen('Home Screen', { id: 1 });

    const expectedEvent = {
      name: 'Home Screen',
      properties: {
        id: 1,
      },
      type: 'screen',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.logger.info).toHaveBeenCalledTimes(1);
    expect(client.logger.info).toHaveBeenCalledWith(
      'SCREEN event saved',
      expectedEvent
    );
  });
});
