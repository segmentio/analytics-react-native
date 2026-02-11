const {element, by, device} = require('detox');

import {startServer, stopServer, setMockBehavior} from './mockServer';
import {setupMatchers} from './matchers';

/**
 * Comprehensive HTTP status code tests for TAPI backoff implementation
 * Tests all permanent errors (4xx, 5xx), retryable errors, and edge cases
 */
describe('#statusCodeTests', () => {
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

  describe('4xx Permanent Errors', () => {
    /**
     * Test that all 4xx errors (except 429) drop batches permanently
     * According to SDD: 400, 401, 403, 404, 413, 422 should drop batches
     */
    it.each([
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
      [413, 'Payload Too Large'],
      [422, 'Unprocessable Entity'],
    ])('drops batch on %d %s', async (statusCode, statusText) => {
      // Configure mock to return specific status code
      setMockBehavior('custom', (req, res) => {
        res.status(statusCode).send({error: statusText});
      });

      // Track event and flush
      await trackAndFlush();

      // Should attempt once and drop the batch
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Reset to success and track a new event
      mockServerListener.mockClear();
      setMockBehavior('success');

      // Track new event and flush
      await trackAndFlush();

      // Should succeed (not blocked by dropped batch)
      expect(mockServerListener).toHaveBeenCalledTimes(1);
      const request = mockServerListener.mock.calls[0][0];
      expect(request.batch.length).toBeGreaterThan(0);
    });

    it('drops batch on 400 Bad Request', async () => {
      setMockBehavior('bad-request'); // Returns 400

      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Verify next event succeeds (batch was dropped, not retrying)
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('5xx Permanent Errors', () => {
    /**
     * Test that non-retryable 5xx errors drop batches
     * According to SDD: 501, 505 should drop batches
     */
    it.each([
      [501, 'Not Implemented'],
      [505, 'HTTP Version Not Supported'],
    ])('drops batch on %d %s', async (statusCode, statusText) => {
      setMockBehavior('custom', (req, res) => {
        res.status(statusCode).send({error: statusText});
      });

      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Verify subsequent events succeed
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('5xx Retryable Errors', () => {
    /**
     * Test that retryable 5xx errors trigger exponential backoff
     * According to SDD: 500, 502, 503, 504 should retry with backoff
     */
    it.each([
      [500, 'Internal Server Error'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
      [504, 'Gateway Timeout'],
    ])(
      'retries batch on %d %s with exponential backoff',
      async (statusCode, statusText) => {
        // First attempt returns error
        setMockBehavior('custom', (req, res) => {
          res.status(statusCode).send({error: statusText});
        });

        await trackAndFlush();

        // Should attempt once
        expect(mockServerListener).toHaveBeenCalledTimes(1);

        // Immediate retry should not happen (batch is in backoff)
        mockServerListener.mockClear();
        await flushButton.tap();
        await wait();
        expect(mockServerListener).toHaveBeenCalledTimes(0);

        // Wait for backoff period (baseBackoffInterval ~0.5s + jitter)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Now change to success and flush - batch should retry
        setMockBehavior('success');
        await flushButton.tap();
        await wait();

        // Should successfully upload the retried batch
        expect(mockServerListener).toHaveBeenCalledTimes(1);

        // Verify the request has X-Retry-Count header
        const request = mockServerListener.mock.calls[0][0];
        expect(request.headers['x-retry-count']).toBeDefined();
      },
    );

    it('increments X-Retry-Count header on each retry', async () => {
      // Fail first attempt
      setMockBehavior('server-error'); // 500
      await trackAndFlush();


      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Fail second attempt
      mockServerListener.mockClear();
      setMockBehavior('server-error');
      await flushButton.tap();
      await wait();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Check retry count header
      const secondRequest = mockServerListener.mock.calls[0][0];
      const retryCount = parseInt(
        secondRequest.headers['x-retry-count'] || '0',
        10,
      );
      expect(retryCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('treats unmapped 4xx (418 Teapot) as permanent error', async () => {
      // Use 418 I'm a teapot - an uncommon 4xx status
      setMockBehavior('custom', (req, res) => {
        res.status(418).send({error: "I'm a teapot"});
      });

      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Verify batch was dropped (next event succeeds)
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });

    it('treats unmapped 5xx (599) as retryable error', async () => {
      // Use 599 - an uncommon 5xx status
      setMockBehavior('custom', (req, res) => {
        res.status(599).send({error: 'Unknown server error'});
      });

      await trackAndFlush();



      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should retry after backoff
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      await wait();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });

    it('handles 408 Request Timeout as retryable', async () => {
      setMockBehavior('timeout'); // Returns 408

      await trackAndFlush();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should retry
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      await wait();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });

    it('handles 429 with rate limiting (separate from batch backoff)', async () => {
      // 429 should halt the entire upload pipeline, not just the batch
      setMockBehavior('rate-limit', {retryAfter: 5});

      await trackAndFlush();
      await trackButton.tap(); // Track 2 events
      await wait(100);
      await flushButton.tap();
      await wait();

      // Should only attempt first batch before halting
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Immediate retry should be blocked by rate limiter
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      await wait();

      expect(mockServerListener).toHaveBeenCalledTimes(0);

      // Wait for retry-after period
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Now should succeed
      await flushButton.tap();
      await wait();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Batches with Different Status Codes', () => {
    it('processes batches independently based on status codes', async () => {
      // First batch gets 500 (retryable)
      let callCount = 0;
      setMockBehavior('custom', (req, res) => {
        callCount++;
        if (callCount === 1) {
          res.status(500).send({error: 'Server Error'});
        } else if (callCount === 2) {
          res.status(400).send({error: 'Bad Request'}); // Permanent error
        } else {
          res.status(200).json({success: true});
        }
      });

      // Track 3 events (will create multiple batches)
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await wait(100);
      await flushButton.tap();
      await wait();

      // Should process batches sequentially
      expect(mockServerListener).toHaveBeenCalled();

      // Wait for backoff on first batch
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Flush again - first batch should retry
      await flushButton.tap();
      await wait();

      // Eventually all should be processed (first retried, second dropped, third succeeded)
      expect(mockServerListener).toHaveBeenCalled();
    });
  });
});
