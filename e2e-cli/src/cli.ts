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
        switch (evt.type) {
          case 'track':
            if (!evt.event) {
              throw new Error('track event requires "event" field');
            }
            await client.track(
              evt.event,
              evt.properties as JsonMap | undefined
            );
            break;
          case 'identify':
            await client.identify(evt.userId, evt.traits as JsonMap | undefined);
            break;
          case 'screen':
            if (!evt.name) {
              throw new Error('screen event requires "name" field');
            }
            await client.screen(
              evt.name,
              evt.properties as JsonMap | undefined
            );
            break;
          case 'group':
            if (!evt.groupId) {
              throw new Error('group event requires "groupId" field');
            }
            await client.group(
              evt.groupId,
              evt.traits as JsonMap | undefined
            );
            break;
          case 'alias':
            if (!evt.userId) {
              throw new Error('alias event requires "userId" field');
            }
            await client.alias(evt.userId);
            break;
          case 'page':
            // React Native SDK has no page method; map to screen
            if (!evt.name) {
              throw new Error('page event requires "name" field');
            }
            await client.screen(
              evt.name,
              evt.properties as JsonMap | undefined
            );
            break;
          default:
            throw new Error(`Unknown event type: ${evt.type}`);
        }
      }
    }

    // Flush all queued events through the real pipeline
    await client.flush();

    // Brief delay to let async upload operations settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    client.cleanup();

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
