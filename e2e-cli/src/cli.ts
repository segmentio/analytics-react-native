/**
 * E2E CLI for React Native analytics SDK testing
 *
 * Runs the real SDK pipeline (SegmentClient -> Timeline -> SegmentDestination ->
 * QueueFlushingPlugin -> uploadEvents) with stubs for React Native runtime
 * dependencies so everything executes on Node.js.
 *
 * Usage:
 *   node dist/cli.js --input '{"writeKey":"...", ...}'
 */

import { SegmentClient } from '../../packages/core/src/analytics';
import { SovranStorage } from '../../packages/core/src/storage/sovranStorage';
import { Logger } from '../../packages/core/src/logger';
import type { Config, JsonMap } from '../../packages/core/src/types';
import { ErrorType } from '../../packages/core/src/errors';
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
// Helper Functions
// ============================================================================

function buildConfig(input: CLIInput): Config {
  return {
    writeKey: input.writeKey,
    trackAppLifecycleEvents: false,
    trackDeepLinks: false,
    autoAddSegmentDestination: true,
    storePersistor: MemoryPersistor,
    storePersistorSaveDelay: 0,
    ...(input.apiHost && { proxy: input.apiHost, useSegmentEndpoints: true }),
    ...(input.cdnHost && {
      cdnProxy: input.cdnHost,
      useSegmentEndpoints: true,
    }),
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
    flushInterval: input.config?.flushInterval ?? 0.1,
    ...(input.config?.maxRetries !== undefined && {
      httpConfig: {
        rateLimitConfig: { maxRetryCount: input.config.maxRetries },
        backoffConfig: { maxRetryCount: input.config.maxRetries },
      },
    }),
  };
}

async function dispatchEvent(
  client: SegmentClient,
  evt: AnalyticsEvent
): Promise<void> {
  switch (evt.type) {
    case 'track':
      if (!evt.event) {
        console.warn(`[e2e] skipping track: missing event name`);
        return;
      }
      await client.track(evt.event, evt.properties as JsonMap | undefined);
      break;
    case 'identify':
      await client.identify(evt.userId, evt.traits as JsonMap | undefined);
      break;
    case 'screen':
    case 'page':
      if (!evt.name) {
        console.warn(`[e2e] skipping ${evt.type}: missing name`);
        return;
      }
      await client.screen(evt.name, evt.properties as JsonMap | undefined);
      break;
    case 'group':
      if (!evt.groupId) {
        console.warn(`[e2e] skipping group: missing groupId`);
        return;
      }
      await client.group(evt.groupId, evt.traits as JsonMap | undefined);
      break;
    case 'alias':
      if (!evt.userId) {
        console.warn(`[e2e] skipping alias: missing userId`);
        return;
      }
      await client.alias(evt.userId);
      break;
    default:
      console.warn(`[e2e] skipping event: unknown type "${evt.type}"`);
  }
}

/** Polls pendingEvents() until the queue is empty or timeout. Returns true if drained. */
async function waitForQueueDrain(
  client: SegmentClient,
  timeoutMs = 30_000
): Promise<boolean> {
  const pollMs = 50;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await client.pendingEvents()) === 0) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

// ============================================================================
// Main
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
    let permanentDropCount = 0;
    const config: Config = {
      ...buildConfig(input),
      errorHandler: (error) => {
        if (error.type === ErrorType.EventsDropped) {
          permanentDropCount++;
        }
      },
    };

    const store = new SovranStorage({
      storeId: input.writeKey,
      storePersistor: MemoryPersistor,
      storePersistorSaveDelay: 0,
    });
    const logger = new Logger(true);
    const client = new SegmentClient({ config, logger, store });
    await client.init();

    for (const sequence of input.sequences) {
      if (sequence.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sequence.delayMs));
      }
      for (const evt of sequence.events) {
        await dispatchEvent(client, evt);
      }
    }

    await client.flush();
    const drained = await waitForQueueDrain(client);

    const finalPending = drained ? 0 : await client.pendingEvents();
    const totalEvents = input.sequences.reduce(
      (sum, seq) => sum + seq.events.length,
      0
    );
    const delivered = Math.max(
      0,
      totalEvents - finalPending - permanentDropCount
    );
    // Approximate: SDK doesn't expose actual batch count, so we derive it
    // from delivered event count and configured batch size.
    const sentBatches =
      delivered > 0
        ? Math.ceil(delivered / Math.max(1, input.config?.flushAt ?? 1))
        : 0;
    const success = finalPending === 0 && permanentDropCount === 0;

    client.cleanup();
    output = {
      success,
      sentBatches,
      ...(permanentDropCount > 0 && {
        error: `${permanentDropCount} events permanently dropped`,
      }),
    };
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
