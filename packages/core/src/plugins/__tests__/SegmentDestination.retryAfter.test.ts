import { SegmentClient } from '../../analytics';
import * as api from '../../api';
import {
  createMockStoreGetter,
  getMockLogger,
  MockSegmentStore,
} from '../../test-helpers';
import { HttpConfig, SegmentEvent, UpdateType } from '../../types';
import {
  SEGMENT_DESTINATION_KEY,
  SegmentDestination,
} from '../SegmentDestination';
import { RetryManager } from '../../backoff/RetryManager';

jest.mock('uuid');

/**
 * Generic Retry-After wiring tests (design: "Generic Retry-After Header
 * Support (HTTP 529 + Beyond)", Option B).
 *
 * Verifies SegmentDestination routes any retryable response that carries a
 * Retry-After header through the server-directed wait path (RetryManager
 * .handleRetryAfter) rather than exponential backoff (.handleTransientError),
 * regardless of which status code (429, 529, 503, 408) carried it. Codes
 * without the header keep using backoff, and permanent codes ignore it.
 */
describe('SegmentDestination — generic Retry-After', () => {
  const store = new MockSegmentStore();
  const clientArgs = {
    logger: getMockLogger(),
    config: {
      writeKey: '123-456',
      maxBatchSize: 100,
      flushInterval: 0,
    },
    store,
  };

  // A minimal httpConfig that enables both the rate-limit (server-directed)
  // and backoff paths, with the doc's retryable status overrides.
  const httpConfig: HttpConfig = {
    rateLimitConfig: {
      enabled: true,
      maxRetryCount: 100,
      maxRetryInterval: 300,
      maxRateLimitDuration: 43200,
    },
    backoffConfig: {
      enabled: true,
      maxRetryCount: 100,
      baseBackoffInterval: 0.5,
      maxBackoffInterval: 300,
      maxTotalBackoffDuration: 43200,
      jitterPercent: 0,
      default4xxBehavior: 'drop',
      default5xxBehavior: 'retry',
      statusCodeOverrides: {
        '408': 'retry',
        '529': 'retry',
      },
    },
  };

  /** Build a Response-like object the plugin can read status/headers from. */
  const fakeResponse = (
    status: number,
    headers: Record<string, string> = {}
  ): Response => {
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      lower[k.toLowerCase()] = v;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      headers: {
        get: (name: string) => lower[name.toLowerCase()] ?? null,
      },
    } as unknown as Response;
  };

  const setup = (events: SegmentEvent[]) => {
    const plugin = new SegmentDestination();
    const analytics = new SegmentClient({
      ...clientArgs,
      store: new MockSegmentStore({
        settings: { [SEGMENT_DESTINATION_KEY]: {} },
      }),
    });
    plugin.configure(analytics);

    // update() with an integration-level httpConfig so the plugin lazily
    // constructs a real RetryManager (the code path under test).
    plugin.update(
      {
        integrations: {
          [SEGMENT_DESTINATION_KEY]: { httpConfig } as never,
        },
      },
      UpdateType.initial
    );

    jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - reach into the queue plugin's store like the sibling suite
      .spyOn(plugin.queuePlugin.queueStore!, 'getState')
      .mockImplementation(createMockStoreGetter(() => ({ events })));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - retryManager is private; grab it for spying
    const retryManager = plugin.retryManager as RetryManager;
    const retryAfterSpy = jest.spyOn(retryManager, 'handleRetryAfter');
    const transientSpy = jest.spyOn(retryManager, 'handleTransientError');

    return { plugin, retryManager, retryAfterSpy, transientSpy };
  };

  const event = (id: string): SegmentEvent =>
    ({ messageId: id } as SegmentEvent);

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a RetryManager from integration httpConfig', () => {
    const { retryManager } = setup([event('m-1')]);
    expect(retryManager).toBeInstanceOf(RetryManager);
  });

  it.each([529, 503, 408])(
    'routes %s + Retry-After through the server-directed wait, not backoff',
    async (status) => {
      jest
        .spyOn(api, 'uploadEvents')
        .mockResolvedValue(fakeResponse(status, { 'Retry-After': '30' }));

      const { plugin, retryAfterSpy, transientSpy } = setup([event('m-1')]);

      await plugin.flush();

      expect(retryAfterSpy).toHaveBeenCalledTimes(1);
      expect(retryAfterSpy).toHaveBeenCalledWith(30);
      expect(transientSpy).not.toHaveBeenCalled();
    }
  );

  it('uses exponential backoff for 529 WITHOUT a Retry-After header', async () => {
    jest.spyOn(api, 'uploadEvents').mockResolvedValue(fakeResponse(529));

    const { plugin, retryAfterSpy, transientSpy } = setup([event('m-1')]);

    await plugin.flush();

    expect(transientSpy).toHaveBeenCalledTimes(1);
    expect(retryAfterSpy).not.toHaveBeenCalled();
  });

  it('still honors Retry-After on 429 (unchanged behavior)', async () => {
    jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(fakeResponse(429, { 'Retry-After': '12' }));

    const { plugin, retryAfterSpy, transientSpy } = setup([event('m-1')]);

    await plugin.flush();

    expect(retryAfterSpy).toHaveBeenCalledWith(12);
    expect(transientSpy).not.toHaveBeenCalled();
  });

  it('parses HTTP-date Retry-After on 529 into a relative wait', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const when = new Date(1_000_000 + 45_000).toUTCString();
    jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(fakeResponse(529, { 'Retry-After': when }));

    const { plugin, retryAfterSpy } = setup([event('m-1')]);

    await plugin.flush();

    expect(retryAfterSpy).toHaveBeenCalledTimes(1);
    // ~45s from "now"; date second-rounding can yield 44 or 45.
    const waited = retryAfterSpy.mock.calls[0][0];
    expect(waited).toBeGreaterThanOrEqual(44);
    expect(waited).toBeLessThanOrEqual(45);
  });

  it('clamps an excessive Retry-After to maxRetryInterval on 529', async () => {
    jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(fakeResponse(529, { 'Retry-After': '99999' }));

    const { plugin, retryAfterSpy } = setup([event('m-1')]);

    await plugin.flush();

    // parseRetryAfter clamps to maxRetryInterval (300) before it reaches the
    // RetryManager.
    expect(retryAfterSpy).toHaveBeenCalledWith(300);
  });

  it('ignores Retry-After on a permanent (non-retryable) code', async () => {
    jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(fakeResponse(400, { 'Retry-After': '30' }));

    const { plugin, retryAfterSpy, transientSpy } = setup([event('m-1')]);

    await plugin.flush();

    expect(retryAfterSpy).not.toHaveBeenCalled();
    expect(transientSpy).not.toHaveBeenCalled();
  });
});
