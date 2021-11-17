import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import * as ReactNative from 'react-native';
import { EventType } from '../../types';
import { mockPersistor } from '../__helpers__/mockPersistor';

jest.mock('../../uuid', () => ({
  getUUID: () => 'mocked-uuid',
}));

const defaultClientConfig = {
  config: {
    writeKey: 'mock-write-key',
    trackDeepLinks: true,
  },
  logger: getMockLogger(),
  store: {
    dispatch: jest.fn() as jest.MockedFunction<any>,
    getState: () => ({
      main: {
        context: {
          app: {
            version: '1.0',
            build: '1',
          },
        },
      },
      userInfo: {
        userId: 'user-1',
        anonymousId: 'secret-user-1',
      },
    }),
  },
  persistor: mockPersistor,
  actions: {},
};

describe('#trackDeepLinks', () => {
  beforeEach(() => {
    jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValueOnce('2000-01-01T00:00:00.000Z');
  });

  it('sends a track event when trackDeepLinks is enabled and the app was opened from a link', async () => {
    const client = new SegmentClient(defaultClientConfig);
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await client.trackDeepLinks();

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith({
      event: 'Deep Link Opened',
      properties: {
        url: 'myapp://open',
      },
      type: EventType.TrackEvent,
    });
  });

  it('does not send a track event when trackDeepLinks is not enabled', async () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: 'mock-write-key',
        trackDeepLinks: false,
      },
    });
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await client.trackDeepLinks();

    expect(client.process).not.toHaveBeenCalled();
  });

  it('does not send a track event when trackDeepLinks is enabled, but the app was not opened via deep link', async () => {
    const client = new SegmentClient({
      ...defaultClientConfig,
      config: {
        writeKey: 'mock-write-key',
        trackDeepLinks: true,
      },
    });
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce(null);

    await client.trackDeepLinks();

    expect(client.process).not.toHaveBeenCalled();
  });
});
