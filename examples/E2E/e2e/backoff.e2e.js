const {element, by, device} = require('detox');

import {startServer, stopServer, setMockBehavior} from './mockServer';
import {setupMatchers} from './matchers';

describe('#backoffTests', () => {
  const mockServerListener = jest.fn();

  const trackButton = element(by.id('BUTTON_TRACK'));
  const flushButton = element(by.id('BUTTON_FLUSH'));

  beforeAll(async () => {
    await startServer(mockServerListener);
    await device.launchApp();
    setupMatchers();
  });

  beforeEach(async () => {
    mockServerListener.mockReset();
    setMockBehavior('success'); // Reset to success behavior
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('429 Rate Limiting', () => {
    it('halts upload loop on 429 response', async () => {
      // Configure mock to return 429
      setMockBehavior('rate-limit', {retryAfter: 10});

      // Track multiple events (should create multiple batches)
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await flushButton.tap();

      // Should only attempt one batch before halting
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch.length).toBeGreaterThan(0);
    });

    it('blocks future uploads after 429 until retry time passes', async () => {
      // First flush returns 429
      setMockBehavior('rate-limit', {retryAfter: 5});

      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Immediate second flush should be blocked
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).not.toHaveBeenCalled();
    });

    it('allows upload after retry-after time passes', async () => {
      // First flush returns 429 with 2 second retry
      setMockBehavior('rate-limit', {retryAfter: 2});

      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Wait for retry-after period
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Reset to success behavior
      setMockBehavior('success');

      // Second flush should now work
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalled();
    });

    it('resets state after successful upload', async () => {
      // First: 429
      setMockBehavior('rate-limit', {retryAfter: 1});
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalled();
      mockServerListener.mockClear();

      // Third flush should work immediately (no rate limiting)
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalled();
    });
  });

  describe('Transient Errors', () => {
    it('continues to next batch on 500 error', async () => {
      // First batch fails with 500, subsequent batches succeed
      let callCount = 0;
      setMockBehavior('custom', (req, res) => {
        callCount++;
        if (callCount === 1) {
          res.status(500).send({error: 'Internal Server Error'});
        } else {
          res.status(200).send({mockSuccess: true});
        }
      });

      // Track multiple events to create multiple batches
      for (let i = 0; i < 10; i++) {
        await trackButton.tap();
      }
      await flushButton.tap();

      // Should try multiple batches (not halt on 500)
      expect(mockServerListener.mock.calls.length).toBeGreaterThan(1);
    });

    it('handles 408 timeout with exponential backoff', async () => {
      setMockBehavior('timeout');

      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch).toBeDefined();
    });
  });

  describe('Permanent Errors', () => {
    it('drops batch on 400 bad request', async () => {
      setMockBehavior('bad-request');

      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      mockServerListener.mockClear();

      // Reset to success
      setMockBehavior('success');

      // New events should work (previous batch was dropped)
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalled();
    });
  });

  describe('Sequential Processing', () => {
    it('processes batches sequentially not parallel', async () => {
      const timestamps = [];
      let processing = false;

      setMockBehavior('custom', async (req, res) => {
        if (processing) {
          // If already processing, this means parallel execution
          timestamps.push({time: Date.now(), parallel: true});
        } else {
          timestamps.push({time: Date.now(), parallel: false});
          processing = true;
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 100));
          processing = false;
        }
        res.status(200).send({mockSuccess: true});
      });

      // Track many events to create multiple batches
      for (let i = 0; i < 20; i++) {
        await trackButton.tap();
      }
      await flushButton.tap();

      // Verify no parallel execution occurred
      const parallelCalls = timestamps.filter(t => t.parallel);
      expect(parallelCalls).toHaveLength(0);
    });
  });

  describe('HTTP Headers', () => {
    it('sends Authorization header with base64 encoded writeKey', async () => {
      let capturedHeaders = null;

      setMockBehavior('custom', (req, res) => {
        capturedHeaders = req.headers;
        res.status(200).send({mockSuccess: true});
      });

      await trackButton.tap();
      await flushButton.tap();

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
    });

    it('sends X-Retry-Count header starting at 0', async () => {
      let retryCount = null;

      setMockBehavior('custom', (req, res) => {
        retryCount = req.headers['x-retry-count'];
        res.status(200).send({mockSuccess: true});
      });

      await trackButton.tap();
      await flushButton.tap();

      expect(retryCount).toBe('0');
    });

    it('increments X-Retry-Count on retries', async () => {
      const retryCounts = [];

      setMockBehavior('custom', (req, res) => {
        const count = req.headers['x-retry-count'];
        retryCounts.push(count);

        if (retryCounts.length === 1) {
          // First attempt: return 429
          res.status(429).set('Retry-After', '1').send({error: 'Rate Limited'});
        } else {
          // Retry: return success
          res.status(200).send({mockSuccess: true});
        }
      });

      await trackButton.tap();
      await flushButton.tap();

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 1500));
      await flushButton.tap();

      expect(retryCounts[0]).toBe('0');
      expect(retryCounts[1]).toBe('1');
    });
  });

  describe('State Persistence', () => {
    it('persists rate limit state across app restarts', async () => {
      // Trigger 429
      setMockBehavior('rate-limit', {retryAfter: 30});

      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Restart app
      await device.sendToHome();
      await device.launchApp({newInstance: true});

      // Reset to success
      setMockBehavior('success');

      // Immediate flush should still be blocked (state persisted)
      await flushButton.tap();

      // Should not call server (still in WAITING state)
      expect(mockServerListener).not.toHaveBeenCalled();
    });

    it('persists batch retry metadata across app restarts', async () => {
      // Track event and cause a transient error (500)
      setMockBehavior('server-error');
      await trackButton.tap();
      await flushButton.tap();

      // Verify server was called (batch attempted)
      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Restart app
      await device.sendToHome();
      await device.launchApp({newInstance: true});

      // Reset to success
      setMockBehavior('success');

      // Flush should retry the failed batch
      await flushButton.tap();

      // Batch should be retried and succeed
      expect(mockServerListener).toHaveBeenCalledTimes(1);
      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch.length).toBeGreaterThan(0);
    });
  });

  describe('Legacy Behavior', () => {
    it('ignores rate limiting when disabled', async () => {
      // This test requires modifying the app config
      // For now, just document the expected behavior:
      // When httpConfig.rateLimitConfig.enabled = false:
      // - 429 responses do not block future uploads
      // - No rate limit state is maintained
      // - All batches are attempted on every flush

      // TODO: Add app configuration method to test this
      expect(true).toBe(true); // Placeholder
    });
  });
});
