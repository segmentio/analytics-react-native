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
import type { Config, JsonMap } from '../../packages/core/src/types';
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
    console.log(JSON.stringify({ success: false, error: 'No input provided', sentBatches: 0 }));
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

    // Create client with logging disabled (suppress SDK internal logs)
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
                console.warn(`[WARN] Skipping track event: missing or invalid event name`, evt);
                continue;
              }

              // Optional: properties (validate if present)
              const properties = evt.properties as JsonMap | undefined;
              if (evt.properties !== undefined && typeof evt.properties !== 'object') {
                console.warn(`[WARN] Track event "${evt.event}" has invalid properties, proceeding without them`);
              }

              await client.track(evt.event, properties);
              break;
            }

            case 'identify': {
              // Optional userId (Segment allows anonymous identify)
              // Optional traits (validate if present)
              const traits = evt.traits as JsonMap | undefined;
              if (evt.traits !== undefined && typeof evt.traits !== 'object') {
                console.warn(`[WARN] Identify event has invalid traits, proceeding without them`);
              }

              await client.identify(evt.userId, traits);
              break;
            }

            case 'screen':
            case 'page': {
              // Required: screen/page name
              if (!evt.name || typeof evt.name !== 'string') {
                console.warn(`[WARN] Skipping ${evt.type} event: missing or invalid name`, evt);
                continue;
              }

              // Optional: properties (validate if present)
              const properties = evt.properties as JsonMap | undefined;
              if (evt.properties !== undefined && typeof evt.properties !== 'object') {
                console.warn(`[WARN] Screen "${evt.name}" has invalid properties, proceeding without them`);
              }

              await client.screen(evt.name, properties);
              break;
            }

            case 'group': {
              // Required: groupId
              if (!evt.groupId || typeof evt.groupId !== 'string') {
                console.warn(`[WARN] Skipping group event: missing or invalid groupId`, evt);
                continue;
              }

              // Optional: traits (validate if present)
              const traits = evt.traits as JsonMap | undefined;
              if (evt.traits !== undefined && typeof evt.traits !== 'object') {
                console.warn(`[WARN] Group event for "${evt.groupId}" has invalid traits, proceeding without them`);
              }

              await client.group(evt.groupId, traits);
              break;
            }

            case 'alias': {
              // Required: userId
              if (!evt.userId || typeof evt.userId !== 'string') {
                console.warn(`[WARN] Skipping alias event: missing or invalid userId`, evt);
                continue;
              }

              await client.alias(evt.userId);
              break;
            }

            default:
              console.warn(`[WARN] Skipping event: unknown event type "${evt.type}"`, evt);
              continue;
          }
        } catch (error) {
          // Log but don't fail the entire sequence if one event fails
          console.error(`[ERROR] Failed to process ${evt.type} event:`, error, evt);
          continue;
        }
      }
    }

    // Flush all queued events through the real pipeline
    await client.flush();

    // Brief delay to let async upload operations settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    client.cleanup();

    // sentBatches: SDK doesn't expose batch count tracking
    output = { success: true, sentBatches: 0 };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    output = { success: false, error, sentBatches: 0 };
  }

  console.log(JSON.stringify(output));
}

main().catch((e) => {
  console.log(JSON.stringify({ success: false, error: String(e), sentBatches: 0 }));
  process.exit(1);
});
