import { SegmentClient } from '../../analytics';
import * as api from '../../api';
import {
  createMockStoreGetter,
  getMockLogger,
  MockSegmentStore,
} from '../../test-helpers';
import { Config, HttpConfig, SegmentEvent, UpdateType } from '../../types';
import {
  SEGMENT_DESTINATION_KEY,
  SegmentDestination,
} from '../SegmentDestination';
import { RetryManager } from '../../backoff/RetryManager';

jest.mock('uuid');

/**
 * Regression tests for issue #1101: a proxy endpoint returning errors used to
 * be hammered with no delay between attempts.
 *
 * The retry/backoff state was only created in update(), which the timeline only
 * calls once integration settings exist. A failed settings fetch (a common case
 * for proxy users) left the destination with no RetryManager, so every flush
 * uploaded immediately regardless of how many times the endpoint had failed.
 */
describe('SegmentDestination — retry without settings', () => {
  const errorResponse = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    headers: { get: () => null },
  } as unknown as Response;

  const setup = (events: SegmentEvent[], config?: Partial<Config>) => {
    const plugin = new SegmentDestination();
    const analytics = new SegmentClient({
      logger: getMockLogger(),
      config: {
        writeKey: '123-456',
        maxBatchSize: 100,
        flushInterval: 0,
        proxy: 'https://my-proxy.example.com/v1/b',
        ...config,
      },
      // No settings: this is what a failed settings fetch leaves behind
      store: new MockSegmentStore(),
    });
    plugin.configure(analytics);

    jest
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - reach into the queue plugin's store like the sibling suites
      .spyOn(plugin.queuePlugin.queueStore!, 'getState')
      .mockImplementation(createMockStoreGetter(() => ({ events })));

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - retryManager is private
    return { plugin, retryManager: plugin.retryManager as RetryManager };
  };

  const event = (id: string): SegmentEvent =>
    ({ messageId: id } as SegmentEvent);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a RetryManager without waiting for settings', () => {
    const { retryManager } = setup([event('m-1')]);
    expect(retryManager).toBeInstanceOf(RetryManager);
  });

  it('backs off instead of retrying immediately on repeated failures', async () => {
    const uploadSpy = jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(errorResponse);

    const { plugin } = setup([event('m-1')]);

    for (let i = 0; i < 5; i++) {
      await plugin.flush();
    }

    // Only the attempt that triggered the backoff should have reached the endpoint
    expect(uploadSpy).toHaveBeenCalledTimes(1);
  });

  it('honors client-side httpConfig overrides in the fallback config', async () => {
    const uploadSpy = jest
      .spyOn(api, 'uploadEvents')
      .mockResolvedValue(errorResponse);

    const { plugin } = setup([event('m-1')], {
      httpConfig: { backoffConfig: { enabled: false } },
    });

    for (let i = 0; i < 3; i++) {
      await plugin.flush();
    }

    // Backoff disabled by the client: no upload gets blocked
    expect(uploadSpy).toHaveBeenCalledTimes(3);
  });

  it('reconfigures the existing RetryManager when settings arrive', () => {
    const { plugin, retryManager } = setup([event('m-1')]);
    const updateConfigSpy = jest.spyOn(retryManager, 'updateConfig');

    const httpConfig: HttpConfig = {
      backoffConfig: {
        enabled: true,
        maxRetryCount: 7,
        baseBackoffInterval: 0.5,
        maxBackoffInterval: 300,
        maxTotalBackoffDuration: 43200,
        jitterPercent: 0,
        default4xxBehavior: 'drop',
        default5xxBehavior: 'retry',
        statusCodeOverrides: {},
      },
    };

    plugin.update(
      {
        integrations: {
          [SEGMENT_DESTINATION_KEY]: { httpConfig } as never,
        },
      },
      UpdateType.initial
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - retryManager is private
    expect(plugin.retryManager).toBe(retryManager);
    expect(updateConfigSpy).toHaveBeenCalledTimes(1);
    expect(updateConfigSpy.mock.calls[0][1]?.maxRetryCount).toBe(7);
  });
});
