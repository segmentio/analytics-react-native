import { Metrics } from '../metrics';

describe('metrics', () => {
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

  it('creates a client without configuration, but doesnt start uploading', async () => {
    const metrics = new Metrics();
    jest.advanceTimersToNextTimer();

    expect(fetch).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();

    await metrics.cleanup();
  });

  it('starts timers when called with configure', async () => {
    const metrics = new Metrics();
    await metrics.configure();
    jest.advanceTimersToNextTimer();
    expect(setTimeout).toHaveBeenCalled();
    await metrics.cleanup();
  });

  it('starts timer when constructed with options', async () => {
    const metrics = new Metrics({});
    await new Promise(process.nextTick);
    jest.advanceTimersToNextTimer();
    expect(setTimeout).toHaveBeenCalled();
    await metrics.cleanup();
  });

  it('uploads metrics and uses configurations', async () => {
    const metrics = new Metrics();
    const host = 'something-awesome';

    await metrics.configure({
      flushTimer: 500,
      sampleRate: 1.0,
      host: host,
    });

    await metrics.increment('invoke', {
      tag: 'someValue',
    });

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
              metric: 'analytics_js.invoke',
              value: 1,
              tags: {
                tag: 'someValue',
              },
            },
          ],
        }),
      })
    );

    await metrics.cleanup();
  });

  it('limits and prioritizes tags', async () => {
    const metrics = new Metrics();
    const host = 'something-awesome';

    await metrics.configure({
      sampleRate: 1.0,
      host: host,
      flushTimer: 500,
    });

    await metrics.increment('invoke', {
      // These are priority tags
      writeKey: 'writekey',
      message: 'message',
      error: 'error',
      device: 'device',
      os: 'os',
      libraryName: 'name',
      libraryVersion: 'version',
      // These are not
      tag1: 'someValue',
      tag2: 'someValue',
      tag3: 'someValue',
      tag4: 'someValue',
      tag5: 'someValue',
    });

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
              metric: 'analytics_js.invoke',
              value: 1,
              tags: {
                // These are priority tags
                writeKey: 'writekey',
                message: 'message',
                error: 'error',
                device: 'device',
                os: 'os',
                libraryName: 'name',
                libraryVersion: 'version',
                // These are not
                tag1: 'someValue',
                tag2: 'someValue',
                tag3: 'someValue',
              },
            },
          ],
        }),
      })
    );

    await metrics.cleanup();
  });

  it('drops events if not in sample', async () => {
    const metrics = new Metrics();

    await metrics.configure({
      sampleRate: 0.0,
      flushTimer: 500,
    });

    await metrics.increment('invoke', {
      tag: 'someValue',
    });

    jest.advanceTimersToNextTimer();
    // Flushing is async so we wait for it here
    await new Promise(process.nextTick);

    expect(fetch).not.toHaveBeenCalled();

    await metrics.cleanup();
  });

  it('events before configure are queued', async () => {
    const metrics = new Metrics();
    const host = 'something-awesome';

    await metrics.increment('invoke', {
      tag: 'someValue',
    });

    await metrics.configure({
      flushTimer: 500,
      sampleRate: 1.0,
      host: host,
    });

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
              metric: 'analytics_js.invoke',
              value: 1,
              tags: {
                tag: 'someValue',
              },
            },
          ],
        }),
      })
    );

    await metrics.cleanup();
  });
});
