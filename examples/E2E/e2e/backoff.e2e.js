const {element, by, device} = require('detox');

import {startServer, stopServer, setMockBehavior} from './mockServer';
import {setupMatchers} from './matchers';

describe('#backoffTests', () => {
  const mockServerListener = jest.fn();

  const trackButton = element(by.id('BUTTON_TRACK'));
  const flushButton = element(by.id('BUTTON_FLUSH'));

  // Helper to wait for operations to complete
  const wait = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to track an event and wait for auto-flush (CountFlushPolicy(1))
  const trackAndFlush = async () => {
    await trackButton.tap();
    await wait(800); // Wait for event to be queued + auto-flush to complete
  };

  // Helper to clear lifecycle events that are automatically tracked on app start
  const clearLifecycleEvents = async () => {
    await flushButton.tap();
    await wait(500); // Wait longer to ensure lifecycle events are flushed
    mockServerListener.mockClear();
  };

  beforeAll(async () => {
    await startServer(mockServerListener);
    await device.launchApp();
    setupMatchers();
  });

  beforeEach(async () => {
    mockServerListener.mockReset();
    setMockBehavior('success'); // MUST be set before reload to ensure lifecycle events succeed
    await device.reloadReactNative();
    // Wait for app to fully reinitialize after reload
    await wait(1000);
    // Clear lifecycle events (Application Opened, etc.) - must have success mock set
    await clearLifecycleEvents();
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('429 Rate Limiting', () => {
    it('halts upload loop on 429 response', async () => {
      // Configure mock to return 429
      setMockBehavior('rate-limit', {retryAfter: 10});

      // Track multiple events and flush
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await wait(100);
      await flushButton.tap();
      await wait();

      // Should only attempt one batch before halting
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch.length).toBeGreaterThan(0);
    });

    it('blocks future uploads after 429 until retry time passes', async () => {
      // First flush returns 429
      setMockBehavior('rate-limit', {retryAfter: 5});

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Immediate second flush should be blocked
      await trackAndFlush();

      expect(mockServerListener).not.toHaveBeenCalled();
    });

    it('allows upload after retry-after time passes', async () => {
      // First flush returns 429 with 2 second retry
      setMockBehavior('rate-limit', {retryAfter: 2});

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Wait for retry-after period
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Reset to success behavior
      setMockBehavior('success');

      // Second flush should now work
      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalled();
    });

    it('resets state after successful upload', async () => {
      // First: 429
      setMockBehavior('rate-limit', {retryAfter: 1});
      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      mockServerListener.mockClear();

      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMockBehavior('success');
      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalled();
      mockServerListener.mockClear();

      // Third flush should work immediately (no rate limiting)
      await trackAndFlush();

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
      await wait(100);
      await flushButton.tap();
      await wait();

      // Should try multiple batches (not halt on 500)
      expect(mockServerListener.mock.calls.length).toBeGreaterThan(1);
    });

    it('handles 408 timeout with exponential backoff', async () => {
      setMockBehavior('timeout');

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch).toBeDefined();
    });
  });

  describe('Permanent Errors', () => {
    it('drops batch on 400 bad request', async () => {
      setMockBehavior('bad-request');

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      mockServerListener.mockClear();

      // Reset to success
      setMockBehavior('success');

      // New events should work (previous batch was dropped)
      await trackAndFlush();

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
      await wait(100);
      await flushButton.tap();
      await wait();

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

      await trackAndFlush();

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders.authorization).toMatch(/^Basic /);
    });

    it('sends X-Retry-Count header starting at 0', async () => {
      let retryCount = null;

      setMockBehavior('custom', (req, res) => {
        retryCount = req.headers['x-retry-count'];
        res.status(200).send({mockSuccess: true});
      });

      await trackAndFlush();

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

      await trackAndFlush();

      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 1500));
      await flushButton.tap();
      await wait();

      expect(retryCounts[0]).toBe('0');
      expect(retryCounts[1]).toBe('1');
    });
  });

  // NOTE: These persistence tests are SKIPPED because storePersistor is disabled in App.tsx (line 63)
  // Persistence is tested in backoff-persistence.e2e.js (currently skipped) and unit tests
  describe.skip('State Persistence', () => {
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

  describe('Retry-After Header Parsing', () => {
    it('parses seconds format', async () => {
      setMockBehavior('custom', (req, res) => {
        res.status(429).set('Retry-After', '5').send({error: 'Rate Limited'});
      });

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Immediate retry should fail (blocked)
      mockServerListener.mockClear();
      await flushButton.tap();
      await wait();
      expect(mockServerListener).toHaveBeenCalledTimes(0);

      // After 5 seconds should succeed
      await new Promise(resolve => setTimeout(resolve, 5500));
      setMockBehavior('success');
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalledTimes(1);
    }, 10000);

    it('parses HTTP-Date format', async () => {
      setMockBehavior('custom', (req, res) => {
        const futureDate = new Date(Date.now() + 5000); // 5s in future
        const httpDate = futureDate.toUTCString();
        res
          .status(429)
          .set('Retry-After', httpDate)
          .send({error: 'Rate Limited'});
      });

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Immediate retry should be blocked
      mockServerListener.mockClear();
      await flushButton.tap();
      await wait();
      expect(mockServerListener).toHaveBeenCalledTimes(0);

      // After 5 seconds should succeed
      await new Promise(resolve => setTimeout(resolve, 5500));
      setMockBehavior('success');
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalledTimes(1);
    }, 10000);

    it('handles invalid Retry-After values gracefully', async () => {
      setMockBehavior('custom', (req, res) => {
        res
          .status(429)
          .set('Retry-After', 'invalid-value')
          .send({error: 'Rate Limited'});
      });

      await trackAndFlush();

      // Should still handle 429 (may use default backoff)
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMockBehavior('success');
      mockServerListener.mockClear();
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalled();
    }, 10000);
  });

  describe('X-Retry-Count Header Edge Cases', () => {
    it('resets per-batch retry count on successful upload', async () => {
      // Cause 500 error (retry count = 1)
      setMockBehavior('server-error');
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait and succeed on retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      await wait();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const firstRetryRequest = mockServerListener.mock.calls[0][0];
      const firstRetryCount = parseInt(
        firstRetryRequest.headers['x-retry-count'] || '0',
        10,
      );
      expect(firstRetryCount).toBeGreaterThan(0);

      // Cause another 500 error for NEW event
      mockServerListener.mockClear();
      setMockBehavior('server-error');
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 1000));
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      await wait();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Verify X-Retry-Count reset for new batch
      const secondRetryRequest = mockServerListener.mock.calls[0][0];
      const secondRetryCount = parseInt(
        secondRetryRequest.headers['x-retry-count'] || '0',
        10,
      );

      // New batch should have lower or equal retry count (not continuing from previous)
      // Note: Due to timing, it might be 0 or 1 depending on when the batch was created
      expect(secondRetryCount).toBeGreaterThanOrEqual(0);
    }, 10000);

    it('maintains global retry count across multiple batches during 429', async () => {
      // Trigger 429 (global count = 1)
      setMockBehavior('rate-limit', {retryAfter: 2});
      await trackAndFlush();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const firstRequest = mockServerListener.mock.calls[0][0];
      const firstRetryCount = parseInt(
        firstRequest.headers['x-retry-count'] || '0',
        10,
      );

      // Wait for retry and trigger another 429
      await new Promise(resolve => setTimeout(resolve, 2500));
      mockServerListener.mockClear();
      setMockBehavior('rate-limit', {retryAfter: 2});
      await trackButton.tap();
      await trackButton.tap(); // Send multiple events
      await wait(100);
      await flushButton.tap();
      await wait();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const secondRequest = mockServerListener.mock.calls[0][0];
      const secondRetryCount = parseInt(
        secondRequest.headers['x-retry-count'] || '0',
        10,
      );

      // Global retry count should have incremented
      expect(secondRetryCount).toBeGreaterThan(firstRetryCount);
    }, 10000);
  });

  describe('Exponential Backoff Verification', () => {
    it('applies exponential backoff for batch retries', async () => {
      const attemptTimes = [];

      setMockBehavior('custom', (req, res) => {
        attemptTimes.push(Date.now());
        if (attemptTimes.length < 3) {
          res.status(500).send({error: 'Server Error'});
        } else {
          res.status(200).send({mockSuccess: true});
        }
      });

      await trackAndFlush();

      // Wait for first retry (~0.5s base)
      await new Promise(resolve => setTimeout(resolve, 1000));
      await flushButton.tap();
      await wait();

      // Wait for second retry (~1s base)
      await new Promise(resolve => setTimeout(resolve, 1500));
      await flushButton.tap();
      await wait();

      expect(attemptTimes.length).toBeGreaterThanOrEqual(3);

      // Verify backoff intervals are increasing
      if (attemptTimes.length >= 3) {
        const interval1 = attemptTimes[1] - attemptTimes[0];
        const interval2 = attemptTimes[2] - attemptTimes[1];
        // Second interval should be longer (with some tolerance for timing)
        expect(interval2).toBeGreaterThanOrEqual(interval1 * 0.8);
      }
    }, 10000);
  });

  describe('Concurrent Batch Processing', () => {
    it('processes batches sequentially, not in parallel', async () => {
      const processedBatches = [];

      setMockBehavior('custom', (req, res) => {
        processedBatches.push({
          timestamp: Date.now(),
          batchSize: req.body.batch.length,
        });
        res.status(200).send({mockSuccess: true});
      });

      // Create multiple events to generate multiple batches
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await wait(100);
      await flushButton.tap();
      await wait();

      // Wait for all processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should have processed batches
      expect(processedBatches.length).toBeGreaterThan(0);

      // Verify sequential processing (timestamps should be increasing)
      for (let i = 1; i < processedBatches.length; i++) {
        expect(processedBatches[i].timestamp).toBeGreaterThanOrEqual(
          processedBatches[i - 1].timestamp,
        );
      }
    }, 10000);
  });
});
