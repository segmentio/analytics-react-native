import type { SegmentClient } from '../analytics';
import { createClient } from '../client';
import { getMockLogger } from './__helpers__/mockLogger';

jest.mock('uuid');

describe('#createClient', () => {
  const config = {
    writeKey: 'SEGMENT_KEY',
    logger: getMockLogger(),
  };

  let client: SegmentClient | null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    client?.cleanup();
  });

  it('creates the client with the provided logger', () => {
    client = createClient(config);
    expect(client?.logger).toBe(config.logger);
  });

  it('returns undefined client if enabled is set as false', () => {
    client = createClient({ enabled: false, ...config });
    expect(client).toBeNull();
  });
});
