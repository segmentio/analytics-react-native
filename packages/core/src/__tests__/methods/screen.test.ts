import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

jest.mock('../../uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('methods #screen', () => {
  const store = new MockSegmentStore({
    userInfo: {
      userId: 'current-user-id',
      anonymousId: 'very-anonymous',
    },
  });

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the screen event correctly', () => {
    const client = new SegmentClient(clientArgs);
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
  });
});
