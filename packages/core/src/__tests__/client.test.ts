import type { SegmentClient } from '../analytics';
import { createClient } from '../client';
import { getMockLogger } from './__helpers__/mockLogger';

jest.mock('uuid');

describe('#createClient', () => {
  const config = {
    writeKey: 'SEGMENT_KEY',
    logger: getMockLogger(),
  };

  let client: SegmentClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    client.cleanup();
  });

  it('creates the client with the provided logger', async () => {
    client = createClient(config);
    expect(client.logger).toBe(config.logger);
  });
});
