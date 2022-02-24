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
      trackAppLifecycleEvents: false,
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
    store.reset();
  });

  it('sends a track event when trackDeepLinks is enabled and the app was opened from a link', async () => {
    const deepLinkData = {
      url: 'myapp://open',
      referring_application: 'Safari',
    };
    jest.spyOn(store.deepLinkData, 'get').mockReturnValue(deepLinkData);
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    await client.init();

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith({
      event: 'Deep Link Opened',
      properties: deepLinkData,
      type: EventType.TrackEvent,
    });
    client.cleanup();
  });

  it('sends a track event when trackDeepLinks is enabled and the app was launched from a link from background', async () => {
    const deepLinkData = {
      url: 'myapp://open',
      referring_application: 'Safari',
    };

    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    await client.init();
    store.deepLinkData.set(deepLinkData);
    await new Promise(process.nextTick);

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith({
      event: 'Deep Link Opened',
      properties: deepLinkData,
      type: EventType.TrackEvent,
    });
    client.cleanup();
  });

  it('does not send a track event when trackDeepLinks is not enabled', async () => {
    const client = new SegmentClient({
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
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    await client.init();

    expect(client.process).not.toHaveBeenCalled();

    client.cleanup();
  });
});
