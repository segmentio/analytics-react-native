import type { SegmentClientContext } from '../../client';
import track from '../../methods/track';
import { EventType } from '../../types';

import { getMockLogger } from '../__helpers__/mockLogger';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('methods #track', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2010-01-01T00:00:00.000Z');
  });

  it('adds the track event correctly', () => {
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

    track.bind(clientContext)({ eventName: 'Some Event', options: { id: 1 } });

    const expectedEvent = {
      event: 'Some Event',
      properties: {
        id: 1,
      },
      type: EventType.TrackEvent,
    };

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith(expectedEvent);

    expect(clientContext.logger.info).toHaveBeenCalledTimes(1);
    expect(clientContext.logger.info).toHaveBeenCalledWith(
      'TRACK event saved',
      expectedEvent
    );
  });
});
