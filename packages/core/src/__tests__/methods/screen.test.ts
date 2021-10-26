import type { SegmentClientContext } from '../../client';
import screen from '../../methods/screen';
import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('methods #screen', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the screen event correctly', () => {
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

    screen.bind(clientContext)({ name: 'Home Screen', options: { id: 1 } });

    const expectedEvent = {
      name: 'Home Screen',
      properties: {
        id: 1,
      },
      type: 'screen',
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'SCREEN event saved',
      expectedEvent
    );
  });
});
