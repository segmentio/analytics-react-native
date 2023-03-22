import { libraryInfo } from '../../info';
import { MockSegmentStore } from '../../__tests__/__helpers__/mockSegmentStore';
import { Telemetry } from '../telemetry';

describe('telemetry', () => {
  const mockResponse = Promise.resolve({
    ok: true,
    json: () => 'OK',
  });

  beforeAll(() => {
    jest.useFakeTimers('legacy');
  });

  beforeEach(() => {
    jest.spyOn(global, 'setTimeout');

    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('works', async () => {
    const host = 'something-awesome';
    const mockStore = new MockSegmentStore({
      context: {
        device: {
          type: 'deviceType',
          model: 'deviceModel',
        },
        os: {
          name: 'osName',
          version: 'osVersion',
        },
      },
    });
    const telemetry = new Telemetry('write_key', mockStore.context);
    await telemetry.configure({
      sampleRate: 1.0,
      host: host,
      flushTimer: 500,
    });

    await telemetry.record('someOperation', { tag: 'someValue' });

    jest.advanceTimersToNextTimer();
    // Flushing is async so we wait for it here
    await new Promise(process.nextTick);

    expect(fetch).toHaveBeenCalledWith(
      `https://${host}/m`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          series: [
            {
              type: 'Counter',
              metric: 'analytics_mobile.invoke',
              value: 1,
              tags: {
                tag: 'someValue',
                message: 'someOperation',
                writeKey: 'write_key',
                device: 'deviceType-deviceModel',
                os: 'osName-osVersion',
                libraryName: libraryInfo.name,
                libraryVersion: libraryInfo.version,
              },
            },
          ],
        }),
      })
    );

    await telemetry.cleanup();
  });

  it('error ', async () => {
    const host = 'api.segment.io/v1';
    const mockStore = new MockSegmentStore({
      context: {
        device: {
          type: 'deviceType',
          model: 'deviceModel',
        },
        os: {
          name: 'osName',
          version: 'osVersion',
        },
      },
    });
    const telemetry = new Telemetry('write_key', mockStore.context);
    await telemetry.configure({
      sampleRate: 1.0,
      flushTimer: 500,
    });

    await telemetry.error('any_error', { tag: 'someValue' });

    jest.advanceTimersToNextTimer();
    // Flushing is async so we wait for it here
    await new Promise(process.nextTick);

    expect(fetch).toHaveBeenCalledWith(
      `https://${host}/m`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          series: [
            {
              type: 'Counter',
              metric: 'analytics_mobile.invoke.error',
              value: 1,
              tags: {
                tag: 'someValue',
                error: 'any_error',
                writeKey: 'write_key',
                device: 'deviceType-deviceModel',
                os: 'osName-osVersion',
                libraryName: libraryInfo.name,
                libraryVersion: libraryInfo.version,
              },
            },
          ],
        }),
      })
    );

    await telemetry.cleanup();
  });

  it('disabling works on constructor', async () => {
    const mockStore = new MockSegmentStore({
      context: {
        device: {
          type: 'deviceType',
          model: 'deviceModel',
        },
        os: {
          name: 'osName',
          version: 'osVersion',
        },
      },
    });
    const telemetry = new Telemetry('write_key', mockStore.context, false);
    await telemetry.configure({
      sampleRate: 1.0,
      flushTimer: 500,
    });

    await telemetry.error('any_error', { tag: 'someValue' });

    jest.advanceTimersToNextTimer();
    await new Promise(process.nextTick);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('enabling/disabling works on demand', async () => {
    const host = 'api.segment.io/v1';
    const mockStore = new MockSegmentStore({
      context: {
        device: {
          type: 'deviceType',
          model: 'deviceModel',
        },
        os: {
          name: 'osName',
          version: 'osVersion',
        },
      },
    });
    const telemetry = new Telemetry('write_key', mockStore.context);
    await telemetry.configure({
      sampleRate: 1.0,
      flushTimer: 500,
    });
    telemetry.disable();

    await telemetry.error('any_error', { tag: 'someValue' });

    jest.advanceTimersToNextTimer();
    await new Promise(process.nextTick);

    expect(fetch).not.toHaveBeenCalled();

    // When enabled again it won't record the previous metrics
    telemetry.enable();

    jest.advanceTimersToNextTimer();
    await new Promise(process.nextTick);

    expect(fetch).not.toHaveBeenCalled();

    // But new events will show up
    await telemetry.record('someOperation', { tag: 'someValue' });

    jest.advanceTimersToNextTimer();
    await new Promise(process.nextTick);

    expect(fetch).toHaveBeenCalledWith(
      `https://${host}/m`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          series: [
            {
              type: 'Counter',
              metric: 'analytics_mobile.invoke',
              value: 1,
              tags: {
                tag: 'someValue',
                message: 'someOperation',
                writeKey: 'write_key',
                device: 'deviceType-deviceModel',
                os: 'osName-osVersion',
                libraryName: libraryInfo.name,
                libraryVersion: libraryInfo.version,
              },
            },
          ],
        }),
      })
    );

    await telemetry.cleanup();
  });

  it('creates functions for plugins', async () => {
    const host = 'api.segment.io/v1';
    const mockStore = new MockSegmentStore({
      context: {
        device: {
          type: 'deviceType',
          model: 'deviceModel',
        },
        os: {
          name: 'osName',
          version: 'osVersion',
        },
      },
    });
    const telemetry = new Telemetry('write_key', mockStore.context);
    await telemetry.configure({
      sampleRate: 1.0,
      flushTimer: 500,
    });

    const pluginTelemetry = telemetry.getTelemetryForPlugin('MyPlugin');
    await pluginTelemetry.record('any_telemetry');
    await pluginTelemetry.error('any_error');

    jest.advanceTimersToNextTimer();
    // Flushing is async so we wait for it here
    await new Promise(process.nextTick);

    expect(fetch).toHaveBeenCalledWith(
      `https://${host}/m`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          series: [
            {
              type: 'Counter',
              metric: 'analytics_mobile.integration.invoke',
              value: 1,
              tags: {
                plugin: 'MyPlugin',
                message: 'any_telemetry',
                writeKey: 'write_key',
                device: 'deviceType-deviceModel',
                os: 'osName-osVersion',
                libraryName: libraryInfo.name,
                libraryVersion: libraryInfo.version,
              },
            },
            {
              type: 'Counter',
              metric: 'analytics_mobile.integration.invoke.error',
              value: 1,
              tags: {
                plugin: 'MyPlugin',
                error: 'any_error',
                writeKey: 'write_key',
                device: 'deviceType-deviceModel',
                os: 'osName-osVersion',
                libraryName: libraryInfo.name,
                libraryVersion: libraryInfo.version,
              },
            },
          ],
        }),
      })
    );

    await telemetry.cleanup();
  });
});
