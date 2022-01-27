import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

jest.mock('../../uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('methods #alias', () => {
  const store = new MockSegmentStore({
    userInfo: {
      anonymousId: 'anonymousId',
      userId: 'current-user-id',
    },
  });

  const clientArgs = {
    config: {
      writeKey: '123-456',
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('adds the alias event correctly', () => {
    const client = new SegmentClient(clientArgs);

    jest.spyOn(client, 'process');

    client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'current-user-id',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      anonymousId: 'anonymousId',
      userId: 'new-user-id',
      traits: undefined,
    });
  });

  it('uses anonymousId in event if no userId in store', () => {
    const client = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        userInfo: {
          anonymousId: 'anonymousId',
          userId: undefined,
        },
      }),
    });
    jest.spyOn(client, 'process');

    client.alias('new-user-id');

    const expectedEvent = {
      previousId: 'anonymousId',
      type: 'alias',
      userId: 'new-user-id',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      anonymousId: 'anonymousId',
      userId: 'new-user-id',
      traits: undefined,
    });
  });
});
