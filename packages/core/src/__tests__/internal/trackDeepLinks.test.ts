import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import * as ReactNative from 'react-native';
import { EventType } from '../../types';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2000-01-01T00:00:00.000Z');

describe('#trackDeepLinks', () => {
  const store = new MockSegmentStore({
    context: {
      app: {
        name: 'test',
        version: '1.0',
        build: '1',
      },
    },
  });
  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
      trackDeepLinks: true,
    },
    logger: getMockLogger(),
    store: store,
  };
  let client: SegmentClient;

  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    client.cleanup();
  });

  it('sends a track event when trackDeepLinks is enabled and the app was opened from a link', async () => {
    client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await client.init();

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
    client = new SegmentClient({
      ...clientArgs,
      config: {
        writeKey: 'mock-write-key',
        trackDeepLinks: false,
      },
    });
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce('myapp://open');

    await client.init();

    expect(client.process).not.toHaveBeenCalled();

    client.cleanup();
  });

  it('does not send a track event when trackDeepLinks is enabled, but the app was not opened via deep link', async () => {
    client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    jest
      .spyOn(ReactNative.Linking, 'getInitialURL')
      .mockResolvedValueOnce(null);

    await client.init();

    expect(client.process).not.toHaveBeenCalled();

    client.cleanup();
  });
});
