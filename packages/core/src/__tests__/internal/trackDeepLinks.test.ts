import type { SegmentClientContext } from '../../client';
import trackDeepLinks from '../../internal/trackDeepLinks';
import { getMockLogger } from '../__helpers__/mockLogger';
import * as ReactNative from 'react-native';
import { EventType } from '../../types';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

describe('#trackDeepLinks', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2000-01-01T00:00:00.000Z');
  });

  it('sends a track event when trackDeepLinks is enabled and the app was opened from a link', async () => {
    const clientContext = {
      config: {
        trackDeepLinks: true,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            userId: 'user-1',
            anonymousId: 'secret-user-1',
          },
        }),
      },
      actions: {},
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await trackDeepLinks.bind(clientContext)();

    expect(clientContext.process).toHaveBeenCalledTimes(1);
    expect(clientContext.process).toHaveBeenCalledWith({
      event: 'Deep Link Opened',
      properties: {
        url: 'myapp://open',
      },
      type: EventType.TrackEvent,
    });
  });

  it('does not send a track event when trackDeepLinks is not enabled', async () => {
    const clientContext = {
      config: {
        trackDeepLinks: false,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            userId: 'user-1',
            anonymousId: 'secret-user-1',
          },
        }),
      },
      actions: {},
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await trackDeepLinks.bind(clientContext)();

    expect(clientContext.process).not.toHaveBeenCalled();
  });

  it('does not send a track event when trackDeepLinks is enabled, but the app was not opened via deep link', async () => {
    const clientContext = {
      config: {
        trackDeepLinks: false,
      },
      logger: getMockLogger(),
      store: {
        dispatch: jest.fn() as jest.MockedFunction<any>,
        getState: () => ({
          userInfo: {
            userId: 'user-1',
            anonymousId: 'secret-user-1',
          },
        }),
      },
      actions: {},
      process: jest.fn() as jest.MockedFunction<any>,
    } as SegmentClientContext;

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce(null);

    await trackDeepLinks.bind(clientContext)();

    expect(clientContext.process).not.toHaveBeenCalled();
  });
});
