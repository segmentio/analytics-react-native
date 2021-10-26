import type { SegmentClientContext } from '../../client';
import group from '../../methods/group';
import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('methods #group', () => {
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
    } as SegmentClientContext;

    group.bind(clientContext)({
      groupId: 'new-group-id',
      groupTraits: { name: 'Best Group Ever' },
    });

    const expectedEvent = {
      groupId: 'new-group-id',
      type: 'group',
      traits: {
        name: 'Best Group Ever',
      },
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'GROUP event saved',
      expectedEvent
    );
  });
});
