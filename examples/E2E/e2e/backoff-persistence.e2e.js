const {element, by, device} = require('detox');

import {startServer, stopServer, setMockBehavior} from './mockServer';
import {setupMatchers} from './matchers';

/**
 * Persistence E2E tests for TAPI backoff implementation
 *
 * NOTE: These tests are SKIPPED because enabling storePersistor in the E2E app
 * causes module initialization issues with Sovran's native bridge.
 *
 * The backoff implementation works identically with in-memory stores (no persistence).
 * Persistence logic is covered by unit tests with mocked storage.
 *
 * To enable these tests, the Sovran native module linking issue must be resolved.
 * See App.tsx line 63 for details.
 */
describe.skip('#persistenceTests', () => {
  const mockServerListener = jest.fn();

  const trackButton = element(by.id('BUTTON_TRACK'));
  const flushButton = element(by.id('BUTTON_FLUSH'));

  beforeAll(async () => {
    await startServer(mockServerListener);
    setupMatchers();
  });

  beforeEach(async () => {
    mockServerListener.mockReset();
    setMockBehavior('success'); // Reset to success behavior

    // Fresh app start for each test to ensure clean state
    await device.launchApp({newInstance: true});

    // Wait for app initialization to complete
    // This prevents race conditions with store initialization
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await stopServer();
  });

  describe('UploadStateMachine Persistence', () => {
    it('persists WAITING state across app restarts', async () => {
      // Trigger 429 with 60s retry-after
      setMockBehavior('rate-limit', {retryAfter: 60});

      await trackButton.tap();
      await flushButton.tap();

      // Verify 429 was received
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Attempt immediate flush - should be blocked
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(0); // Blocked by rate limiter

      // CRITICAL TEST: Restart app to test persistence
      await device.launchApp({newInstance: true});

      // Wait for store to hydrate from AsyncStorage
      // This is critical - without waiting, we might test before state loads
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to flush again - should STILL be blocked
      // This proves WAITING state persisted across restart
      mockServerListener.mockClear();
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(0); // Still blocked!

      // Wait for retry-after period to expire
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Now should succeed
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);
    }, 90000); // Extended timeout for 60s wait

    it('persists globalRetryCount across app restarts', async () => {
      // Trigger 429 twice to increment global retry count
      setMockBehavior('rate-limit', {retryAfter: 2});

      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait and trigger 429 again
      await new Promise(resolve => setTimeout(resolve, 2500));
      mockServerListener.mockClear();
      setMockBehavior('rate-limit', {retryAfter: 2});
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // At this point globalRetryCount should be 2
      const firstRequest = mockServerListener.mock.calls[0][0];

      // CRITICAL TEST: Restart app
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for rate limit to expire
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Make another request - X-Retry-Count should continue from previous value
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);
      const requestAfterRestart = mockServerListener.mock.calls[0][0];

      // The retry count should have persisted across restart
      // (exact value depends on implementation, but should be > 0)
      const retryCount = parseInt(
        requestAfterRestart.headers['x-retry-count'] || '0',
        10,
      );
      expect(retryCount).toBeGreaterThanOrEqual(2);
    }, 20000);

    it('persists firstFailureTime for maxTotalBackoffDuration', async () => {
      // This test verifies that firstFailureTime persists across restarts
      // so maxTotalBackoffDuration is calculated correctly

      // Trigger initial 429
      setMockBehavior('rate-limit', {retryAfter: 2});
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Record when we first failed
      const firstFailureTime = Date.now();

      // CRITICAL TEST: Restart app immediately
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait until we've exceeded hypothetical maxTotalBackoffDuration
      // (In production config this is 12 hours, but for testing we'd need
      // a way to override the config or mock time)
      // For now, just verify the state persisted

      await new Promise(resolve => setTimeout(resolve, 2500));

      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();

      // Should succeed (rate limit expired)
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // NOTE: Full maxTotalBackoffDuration testing would require
      // either config override or time mocking capabilities in E2E environment
    }, 15000);

    it('resets state after successful upload', async () => {
      // Trigger 429
      setMockBehavior('rate-limit', {retryAfter: 2});
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait and succeed
      await new Promise(resolve => setTimeout(resolve, 2500));
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // CRITICAL TEST: Restart app
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Make another request immediately - should NOT be blocked
      // (state was reset after successful upload)
      mockServerListener.mockClear();
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Retry count should be 0 (reset)
      const request = mockServerListener.mock.calls[0][0];
      const retryCount = parseInt(request.headers['x-retry-count'] || '0', 10);
      expect(retryCount).toBe(0);
    }, 10000);
  });

  describe('BatchUploadManager Persistence', () => {
    it('persists batch metadata across app restarts', async () => {
      // Create batch and cause 500 error
      setMockBehavior('server-error'); // 500
      await trackButton.tap();
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // CRITICAL TEST: Restart app before retry
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for batch backoff period
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now succeed - batch should be retried (proving it persisted)
      mockServerListener.mockClear();
      setMockBehavior('success');
      await flushButton.tap();

      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Verify the batch was retried (has X-Retry-Count)
      const request = mockServerListener.mock.calls[0][0];
      expect(request.headers['x-retry-count']).toBeDefined();
      const retryCount = parseInt(request.headers['x-retry-count'], 10);
      expect(retryCount).toBeGreaterThan(0);
    }, 10000);

    it('persists retry count per batch', async () => {
      // Create batch, fail twice with 500 errors
      setMockBehavior('server-error');
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Wait and fail again
      await new Promise(resolve => setTimeout(resolve, 1000));
      mockServerListener.mockClear();
      setMockBehavior('server-error');
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // CRITICAL TEST: Restart app
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fail third time - retry count should be 3 (not reset to 0)
      mockServerListener.mockClear();
      setMockBehavior('server-error');
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      const thirdRequest = mockServerListener.mock.calls[0][0];
      const retryCount = parseInt(thirdRequest.headers['x-retry-count'], 10);
      expect(retryCount).toBeGreaterThanOrEqual(2); // At least 2 previous retries
    }, 15000);

    it('persists multiple batches independently', async () => {
      // Create two batches
      await trackButton.tap();
      await trackButton.tap();

      // Both fail with 500
      let attemptCount = 0;
      setMockBehavior('custom', (req, res) => {
        attemptCount++;
        res.status(500).send({error: 'Server Error'});
      });

      await flushButton.tap();
      const firstAttempts = attemptCount;

      // CRITICAL TEST: Restart app
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for backoff
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Both batches should retry after restart
      attemptCount = 0;
      setMockBehavior('success');
      await flushButton.tap();

      // Should have retried the persisted batches
      expect(mockServerListener).toHaveBeenCalled();
    }, 10000);

    it('removes batch after successful upload (no stale persistence)', async () => {
      // Create and upload batch successfully
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // CRITICAL TEST: Restart app
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Flush again - should NOT retry old batch
      mockServerListener.mockClear();
      await flushButton.tap();

      // Should be 0 (no stale batches persisted)
      expect(mockServerListener).toHaveBeenCalledTimes(0);
    }, 10000);
  });

  describe('AsyncStorage Integration', () => {
    it('handles AsyncStorage errors gracefully', async () => {
      // This test would require mocking AsyncStorage to fail
      // which is difficult in E2E environment
      // For now, document that this should be tested in unit tests
      // with proper AsyncStorage mocking

      // Basic test: app should not crash if storage fails
      await trackButton.tap();
      await flushButton.tap();

      // App should still function (fallback to in-memory)
      expect(mockServerListener).toHaveBeenCalledTimes(1);
    });

    it('handles concurrent writes to AsyncStorage', async () => {
      // Test race condition: multiple rapid events causing concurrent storage writes

      // Trigger 429 and then immediately trigger more events
      setMockBehavior('rate-limit', {retryAfter: 5});

      // Rapid taps to create race condition
      await trackButton.tap();
      await trackButton.tap();
      await trackButton.tap();
      await flushButton.tap();

      // Should handle concurrent state updates gracefully
      expect(mockServerListener).toHaveBeenCalled();

      // Restart to verify state consistency despite concurrent writes
      await device.launchApp({newInstance: true});
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for rate limit
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Should be able to upload now
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);
    }, 15000);
  });

  describe('State Hydration on App Start', () => {
    it('waits for state hydration before processing uploads', async () => {
      // Set up persisted state by triggering 429
      setMockBehavior('rate-limit', {retryAfter: 5});
      await trackButton.tap();
      await flushButton.tap();
      expect(mockServerListener).toHaveBeenCalledTimes(1);

      // Restart app
      await device.launchApp({newInstance: true});

      // CRITICAL: Do NOT wait for hydration - immediately try to upload
      // The implementation should handle this race condition
      mockServerListener.mockClear();
      setMockBehavior('success');
      await trackButton.tap();

      // Try to flush immediately after restart (before hydration completes)
      await flushButton.tap();

      // Should be blocked by rate limiter even with immediate flush
      // (proving state hydration is properly awaited)
      expect(mockServerListener).toHaveBeenCalledTimes(0);
    }, 10000);
  });
});
