/**
 * E2E CLI for React Native analytics SDK testing
 *
 * This CLI uses code copied directly from the SDK's api.ts and errors.ts
 * to test the real HTTP upload and error handling behavior.
 *
 * Usage:
 *   node dist/cli.js --input '{"writeKey":"...", ...}'
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Types (from SDK's types.ts)
// ============================================================================

interface SegmentEvent {
  type: string;
  anonymousId: string;
  timestamp: string;
  messageId: string;
  context?: Record<string, unknown>;
  userId?: string;
  event?: string;
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>;
}

// ============================================================================
// Copied from SDK's util.ts - getURL and validateURL
// ============================================================================

function getURL(host: string, path: string): string {
  if (!host.startsWith("https://") && !host.startsWith("http://")) {
    host = "https://" + host;
  }
  const s = `${host}${path}`;
  if (!validateURL(s)) {
    console.error("Invalid URL has been passed");
    console.log(`Invalid Url passed is ${s}`);
    throw new Error("Invalid URL has been passed");
  }
  return s;
}

function validateURL(url: string): boolean {
  const urlRegex = new RegExp(
    "^(?:https?:\\/\\/)" + // Protocol (http or https)
      "(?:\\S+(?::\\S*)?@)?" + // Optional user:pass@
      "(?:(localhost|\\d{1,3}(?:\\.\\d{1,3}){3})|" + // Localhost or IP address
      "(?:(?!-)[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*(?:\\.[a-zA-Z]{2,})))" + // Domain validation (supports hyphens)
      "(?::\\d{2,5})?" + // Optional port
      "(\\/[^\\s?#]*)?" + // Path (allows `/projects/yup/settings`)
      "(\\?[a-zA-Z0-9_.-]+=[a-zA-Z0-9_.-]+(&[a-zA-Z0-9_.-]+=[a-zA-Z0-9_.-]+)*)?" + // Query params
      "(#[^\\s]*)?$", // Fragment (optional)
    "i" // Case-insensitive
  );
  return urlRegex.test(url);
}

// ============================================================================
// Copied from SDK's api.ts - uploadEvents
// ============================================================================

const uploadEvents = async ({
  writeKey,
  url,
  events,
}: {
  writeKey: string;
  url: string;
  events: SegmentEvent[];
}) => {
  return await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      batch: events,
      sentAt: new Date().toISOString(),
      writeKey: writeKey,
    }),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};

// ============================================================================
// Copied from SDK's errors.ts - checkResponseForErrors
// ============================================================================

enum ErrorType {
  NetworkUnexpectedHTTPCode,
  NetworkServerLimited,
  NetworkServerRejected,
  NetworkUnknown,
}

class SegmentError extends Error {
  type: ErrorType;
  message: string;
  innerError?: unknown;

  constructor(type: ErrorType, message: string, innerError?: unknown) {
    super(message);
    Object.setPrototypeOf(this, SegmentError.prototype);
    this.type = type;
    this.message = message;
    this.innerError = innerError;
  }
}

class NetworkError extends SegmentError {
  statusCode: number;
  type:
    | ErrorType.NetworkServerLimited
    | ErrorType.NetworkServerRejected
    | ErrorType.NetworkUnexpectedHTTPCode
    | ErrorType.NetworkUnknown;

  constructor(statusCode: number, message: string, innerError?: unknown) {
    let type: ErrorType;
    if (statusCode === 429) {
      type = ErrorType.NetworkServerLimited;
    } else if (statusCode > 300 && statusCode < 400) {
      type = ErrorType.NetworkUnexpectedHTTPCode;
    } else if (statusCode >= 400) {
      type = ErrorType.NetworkServerRejected;
    } else {
      type = ErrorType.NetworkUnknown;
    }

    super(type, message, innerError);
    Object.setPrototypeOf(this, NetworkError.prototype);

    this.statusCode = statusCode;
    this.type = type as NetworkError["type"];
  }
}

const checkResponseForErrors = (response: Response) => {
  if (!response.ok) {
    throw new NetworkError(response.status, response.statusText);
  }
  return response;
};

// ============================================================================
// CLI Input/Output Types
// ============================================================================

interface CLIInput {
  writeKey: string;
  apiHost: string;
  sequences: Array<{
    delayMs: number;
    events: Array<{
      type: string;
      event?: string;
      userId?: string;
      properties?: Record<string, unknown>;
      traits?: Record<string, unknown>;
    }>;
  }>;
  config?: {
    flushAt?: number;
    flushInterval?: number;
  };
}

interface CLIOutput {
  success: boolean;
  error?: string;
}

// ============================================================================
// Main CLI Logic
// ============================================================================

function createEvent(
  input: CLIInput["sequences"][0]["events"][0],
  anonymousId: string
): SegmentEvent {
  return {
    type: input.type,
    anonymousId,
    timestamp: new Date().toISOString(),
    messageId: uuidv4(),
    context: {
      library: { name: "analytics-react-native", version: "e2e-cli" },
    },
    ...(input.userId && { userId: input.userId }),
    ...(input.event && { event: input.event }),
    ...(input.properties && { properties: input.properties }),
    ...(input.traits && { traits: input.traits }),
  };
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let inputStr: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && i + 1 < args.length) {
      inputStr = args[i + 1];
      break;
    }
  }

  if (!inputStr) {
    console.error('Usage: cli --input \'{"writeKey":"...", ...}\'');
    console.log(JSON.stringify({ success: false, error: "No input provided" }));
    process.exit(1);
  }

  let output: CLIOutput;

  try {
    const input: CLIInput = JSON.parse(inputStr);
    const anonymousId = uuidv4();

    // Build URL - uses SDK's getURL function
    const url = getURL(input.apiHost, "/b");

    // Collect events from all sequences
    const allEvents: SegmentEvent[] = [];

    for (const sequence of input.sequences) {
      if (sequence.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, sequence.delayMs));
      }

      for (const eventInput of sequence.events) {
        allEvents.push(createEvent(eventInput, anonymousId));
      }
    }

    // Upload batch - uses SDK's uploadEvents and checkResponseForErrors
    if (allEvents.length > 0) {
      const response = await uploadEvents({
        writeKey: input.writeKey,
        url,
        events: allEvents,
      });
      checkResponseForErrors(response);
    }

    output = { success: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    output = { success: false, error };
  }

  console.log(JSON.stringify(output));
}

main().catch((e) => {
  console.log(JSON.stringify({ success: false, error: String(e) }));
  process.exit(1);
});
