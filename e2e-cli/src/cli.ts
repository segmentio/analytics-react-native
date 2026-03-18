/**
 * E2E CLI for React Native analytics SDK testing
 *
 * Runs the real SDK pipeline (SegmentClient → Timeline → SegmentDestination →
 * QueueFlushingPlugin → uploadEvents) with stubs for React Native runtime
 * dependencies so everything executes on Node.js.
 *
 * Usage:
 *   node dist/cli.js --input '{"writeKey":"...", ...}'
 */

import { SegmentClient } from '../../packages/core/src/analytics';
import { SovranStorage } from '../../packages/core/src/storage/sovranStorage';
import { Logger } from '../../packages/core/src/logger';
import { PluginType } from '../../packages/core/src/types';
import type { Config, JsonMap } from '../../packages/core/src/types';
import { SegmentDestination } from '../../packages/core/src/plugins/SegmentDestination';
import type { Persistor } from '@segment/sovran-react-native';

// ============================================================================
// CLI Input/Output Types
// ============================================================================

interface AnalyticsEvent {
  type: 'identify' | 'track' | 'page' | 'screen' | 'alias' | 'group';
  userId?: string;
  anonymousId?: string;
  messageId?: string;
  timestamp?: string;
  traits?: Record<string, unknown>;
  event?: string;
  properties?: Record<string, unknown>;
  name?: string;
  category?: string;
  previousId?: string;
  groupId?: string;
  context?: Record<string, unknown>;
  integrations?: Record<string, boolean | Record<string, unknown>>;
}

interface EventSequence {
  delayMs: number;
  events: AnalyticsEvent[];
}

interface CLIConfig {
  flushAt?: number;
  flushInterval?: number;
  maxRetries?: number;
}

interface CLIInput {
  writeKey: string;
  apiHost?: string;
  cdnHost?: string;
  sequences: EventSequence[];
  config?: CLIConfig;
}

interface CLIOutput {
  success: boolean;
  error?: string;
  sentBatches: number;
}

// ============================================================================
// In-memory Persistor for Node.js (replaces AsyncStorage)
// ============================================================================

const memStore = new Map<string, unknown>();
const MemoryPersistor: Persistor = {
  get: async <T>(key: string): Promise<T | undefined> =>
    memStore.get(key) as T | undefined,
  set: async <T>(key: string, state: T): Promise<void> => {
    memStore.set(key, state);
  },
};

// ============================================================================
// Main CLI Logic
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let inputStr: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputStr = args[i + 1];
      break;
    }
  }

  if (!inputStr) {
    console.log(
      JSON.stringify({
        success: false,
        error: 'No input provided',
        sentBatches: 0,
      })
    );
    process.exit(1);
  }

  let output: CLIOutput;

  try {
    const input: CLIInput = JSON.parse(inputStr);

    // Build SDK config
    const config: Config = {
      writeKey: input.writeKey,
      trackAppLifecycleEvents: false,
      trackDeepLinks: false,
      autoAddSegmentDestination: true,
      storePersistor: MemoryPersistor,
      storePersistorSaveDelay: 0,
      // When apiHost is provided (mock tests), use proxy to direct events there
      ...(input.apiHost && {
        proxy: input.apiHost,
        useSegmentEndpoints: true,
      }),
      // When cdnHost is provided (mock tests), use cdnProxy to direct CDN requests there
      ...(input.cdnHost && {
        cdnProxy: input.cdnHost,
        useSegmentEndpoints: true,
      }),
      // Provide default settings so SDK doesn't require CDN response
      defaultSettings: {
        integrations: {
          'Segment.io': {
            apiKey: input.writeKey,
            apiHost: 'api.segment.io/v1',
          },
        },
      },
      ...(input.config?.flushAt !== undefined && {
        flushAt: input.config.flushAt,
      }),
      ...(input.config?.flushInterval !== undefined && {
        flushInterval: input.config.flushInterval,
      }),
    };

    // Create storage with in-memory persistor
    const store = new SovranStorage({
      storeId: input.writeKey,
      storePersistor: MemoryPersistor,
      storePersistorSaveDelay: 0,
    });

    // Suppress SDK internal logs to keep E2E test output clean.
    // CLI-level warnings/errors still surface via console.warn/console.error.
    const logger = new Logger(true);
    const client = new SegmentClient({ config, logger, store });

    // Initialize — adds plugins, resolves settings, processes pending events
    await client.init();

    // Process event sequences
    for (const sequence of input.sequences) {
      if (sequence.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sequence.delayMs));
      }

      for (const evt of sequence.events) {
        // Validate event has a type
        if (!evt.type) {
          console.warn('[WARN] Skipping event: missing event type', evt);
          continue;
        }

        try {
          switch (evt.type) {
            case 'track': {
              // Required: event name
              if (!evt.event || typeof evt.event !== 'string') {
                console.warn(
                  `[WARN] Skipping track event: missing or invalid event name`,
                  evt
                );
                continue;
              }

              // Optional: properties (validate if present)
              const properties = evt.properties as JsonMap | undefined;
              if (
                evt.properties !== undefined &&
                (evt.properties === null ||
                  Array.isArray(evt.properties) ||
                  typeof evt.properties !== 'object')
              ) {
                console.warn(
                  `[WARN] Track event "${evt.event}" has invalid properties, proceeding without them`
                );
              }

              await client.track(evt.event, properties);
              break;
            }

            case 'identify': {
              // Optional userId (Segment allows anonymous identify)
              // Optional traits (validate if present)
              const traits = evt.traits as JsonMap | undefined;
              if (
                evt.traits !== undefined &&
                (evt.traits === null ||
                  Array.isArray(evt.traits) ||
                  typeof evt.traits !== 'object')
              ) {
                console.warn(
                  `[WARN] Identify event has invalid traits, proceeding without them`
                );
              }

              await client.identify(evt.userId, traits);
              break;
            }

            case 'screen':
            case 'page': {
              // RN SDK has no page(); map to screen for cross-SDK test compat
              // Required: screen/page name
              if (!evt.name || typeof evt.name !== 'string') {
                console.warn(
                  `[WARN] Skipping ${evt.type} event: missing or invalid name`,
                  evt
                );
                continue;
              }

              // Optional: properties (validate if present)
              const properties = evt.properties as JsonMap | undefined;
              if (
                evt.properties !== undefined &&
                (evt.properties === null ||
                  Array.isArray(evt.properties) ||
                  typeof evt.properties !== 'object')
              ) {
                console.warn(
                  `[WARN] Screen "${evt.name}" has invalid properties, proceeding without them`
                );
              }

              await client.screen(evt.name, properties);
              break;
            }

            case 'group': {
              // Required: groupId
              if (!evt.groupId || typeof evt.groupId !== 'string') {
                console.warn(
                  `[WARN] Skipping group event: missing or invalid groupId`,
                  evt
                );
                continue;
              }

              // Optional: traits (validate if present)
              const traits = evt.traits as JsonMap | undefined;
              if (
                evt.traits !== undefined &&
                (evt.traits === null ||
                  Array.isArray(evt.traits) ||
                  typeof evt.traits !== 'object')
              ) {
                console.warn(
                  `[WARN] Group event for "${evt.groupId}" has invalid traits, proceeding without them`
                );
              }

              await client.group(evt.groupId, traits);
              break;
            }

            case 'alias': {
              // Required: userId
              if (!evt.userId || typeof evt.userId !== 'string') {
                console.warn(
                  `[WARN] Skipping alias event: missing or invalid userId`,
                  evt
                );
                continue;
              }

              await client.alias(evt.userId);
              break;
            }

            default:
              console.warn(
                `[WARN] Skipping event: unknown event type "${evt.type}"`,
                evt
              );
              continue;
          }
        } catch (error) {
          // Log but don't fail the entire sequence if one event fails
          console.error(
            `[ERROR] Failed to process ${evt.type} event:`,
            error,
            evt
          );
          continue;
        }
      }
    }

    // ==================================================================
    // Flush-retry loop
    // ==================================================================
    //
    // Simulates the flush policy cadence that drives uploads in a real
    // app. The SDK's flush policies (timer every 30s, count at 20
    // events) are not active in the CLI, so we drive flush cycles
    // manually.
    //
    // Each cycle: flush → check pending → wait for backoff → repeat
    // until the queue is empty or maxRetries is exceeded.

    const maxRetries = input.config?.maxRetries ?? 10;
    let flushAttempts = 0;
    let permanentDropCount = 0;

    // Intercept logger.error to detect permanently dropped events.
    // The tapi branch logs "Dropped N events due to permanent errors"
    // when events receive non-retryable status codes (4xx). On master
    // this message doesn't occur, so the counter stays at 0.
    const origLoggerError = logger.error;
    logger.error = (message?: unknown, ...rest: unknown[]) => {
      const msg = String(message ?? '');
      const match = msg.match(/Dropped (\d+) events/);
      if (match) {
        permanentDropCount += parseInt(match[1], 10);
      }
      origLoggerError.call(logger, message, ...rest);
    };

    // Find the SegmentDestination to access retry state (if available).
    const segmentDest = client
      .getPlugins(PluginType.destination)
      .find((p): p is SegmentDestination => p instanceof SegmentDestination);

    while (flushAttempts <= maxRetries) {
      await client.flush();
      flushAttempts++;

      const pending = await client.pendingEvents();
      if (pending === 0) break;
      if (flushAttempts > maxRetries) break;

      // Wait for RetryManager backoff before next flush cycle.
      // The tapi branch adds a RetryManager that tracks backoff state
      // (READY / BACKING_OFF / RATE_LIMITED). When available, we sleep
      // until waitUntilTime so the next flush can proceed.
      // On master (no RetryManager), we use a short fixed delay.
      let waited = false;
      if (segmentDest) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const retryMgr = (segmentDest as any).retryManager;
        if (retryMgr?.store) {
          try {
            const state = await retryMgr.store.getState(true);
            if (state.state && state.state !== 'READY') {
              const delay = Math.max(0, state.waitUntilTime - Date.now());
              await new Promise((r) => setTimeout(r, delay + 50));
              waited = true;
            }
          } catch {
            // RetryManager state access failed — fall through to fixed delay
          }
        }
      }
      if (!waited) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Restore logger
    logger.error = origLoggerError;

    // Compute results
    const finalPending = await client.pendingEvents();
    const totalEvents = input.sequences.reduce(
      (sum, seq) => sum + seq.events.length,
      0
    );
    const delivered = Math.max(
      0,
      totalEvents - finalPending - permanentDropCount
    );
    const sentBatches =
      delivered > 0
        ? Math.ceil(delivered / Math.max(1, input.config?.flushAt ?? 1))
        : 0;

    // success: true only when all events were delivered (none remaining,
    // none permanently dropped).
    const success = finalPending === 0 && permanentDropCount === 0;

    client.cleanup();
    output = { success, sentBatches };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    output = { success: false, error, sentBatches: 0 };
  }

  console.log(JSON.stringify(output));
}

main().catch((e) => {
  console.log(
    JSON.stringify({ success: false, error: String(e), sentBatches: 0 })
  );
  process.exit(1);
});
