# analytics-react-native e2e-cli

E2E test CLI for the [@segment/analytics-react-native](https://github.com/segmentio/analytics-react-native) SDK. This CLI uses code copied from the SDK's internals (HTTP upload, error handling) to test the real network behavior from Node.js, bypassing the React Native runtime.

## Setup

```bash
npm install
npm run build
```

## Usage

```bash
node dist/cli.js --input '{"writeKey":"...", ...}'
```

## Input Format

```jsonc
{
  "writeKey": "your-write-key",       // required
  "apiHost": "https://...",           // optional — defaults to api.segment.io
  "cdnHost": "https://...",           // optional — not used yet (reserved for future)
  "sequences": [                      // required — event sequences to send
    {
      "delayMs": 0,
      "events": [
        { "type": "track", "event": "Test", "userId": "user-1" }
      ]
    }
  ],
  "config": {                         // optional
    "flushAt": 1,
    "flushInterval": 1000
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
