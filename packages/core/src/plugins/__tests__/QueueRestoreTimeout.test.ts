import { SegmentClient } from '../../analytics';
import { getMockLogger, MockSegmentStore } from '../../test-helpers';
import type { Config } from '../../types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createPersistor = (getDelay: number): Config['storePersistor'] => ({
  get: async <T>() => {
    await delay(getDelay);
    return undefined as unknown as T;
  },
  set: () => Promise.resolve(),
});

const createClient = (
  storePersistor: Config['storePersistor'],
  settingsDelay: number
) => {
  const client = new SegmentClient({
    config: {
      writeKey: 'SEGMENT_KEY',
      autoAddSegmentDestination: true,
      flushInterval: 0,
      flushAt: 1,
      storePersistor,
    },
    logger: getMockLogger(),
    store: new MockSegmentStore({ isReady: true }),
  });

  global.fetch = jest.fn().mockImplementation(async () => {
    await delay(settingsDelay);
    return {
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          integrations: { 'Segment.io': { apiKey: 'SEGMENT_KEY' } },
        }),
    };
  }) as unknown as typeof fetch;

  return client;
};

const reportedErrors = async (client: SegmentClient) => {
  const reportInternalError = jest.spyOn(client, 'reportInternalError');
  await client.init();
  await client.track('test event');
  await client.flush();
  return reportInternalError.mock.calls.map((c) => c[0].message);
};

describe('queue restoration timeout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The restore timeout must only cover the store restoration, not the client init that precedes it
  it('does not time out when fetching settings takes longer than the restore timeout', async () => {
    const client = createClient(createPersistor(0), 1200);

    expect(await reportedErrors(client)).not.toContain(
      'Queue restoration timeout'
    );

    client.cleanup();
  }, 20000);

  it('still times out when the store itself takes longer than the restore timeout to restore', async () => {
    const client = createClient(createPersistor(1500), 0);

    expect(await reportedErrors(client)).toContain('Queue restoration timeout');

    client.cleanup();
  }, 20000);
});
