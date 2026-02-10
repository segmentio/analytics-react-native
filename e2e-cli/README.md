# analytics-react-native e2e-cli

E2E test CLI for the [@segment/analytics-react-native](https://github.com/segmentio/analytics-react-native) SDK. Runs the **real SDK pipeline** on Node.js — events flow through `SegmentClient` → Timeline → `SegmentDestination` (batch chunking, upload) → `QueueFlushingPlugin` (queue management) → `uploadEvents` HTTP POST.

React Native runtime dependencies (`AppState`, `NativeModules`, sovran native bridge, AsyncStorage) are stubbed with minimal Node.js equivalents so the full event processing pipeline executes without a React Native runtime.

## Setup

```bash
npm install
npm run build
```

The build uses esbuild to bundle the CLI + SDK source + stubs into a single `dist/cli.js`.

## Usage

```bash
node dist/cli.js --input '{"writeKey":"...", ...}'
```

## Input Format

```jsonc
{
  "writeKey": "your-write-key",       // required
  "apiHost": "https://...",           // optional — SDK default if omitted
  "cdnHost": "https://...",           // optional — SDK default if omitted
  "sequences": [                      // required — event sequences to send
    {
      "delayMs": 0,
      "events": [
        { "type": "track", "event": "Test", "userId": "user-1" }
      ]
    }
  ],
  "config": {                         // optional
    "flushAt": 20,
    "flushInterval": 30
  }
}
```

## Output Format

```json
{ "success": true }
```

On failure:

```json
{ "success": false, "error": "description" }
```
