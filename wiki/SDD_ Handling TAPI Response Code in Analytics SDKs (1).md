# SDD: Handling TAPI Response Code in Analytics SDKs

# Reviewers

| Reviewer | Status | Comments |
| :---- | :---- | :---- |
| [Michael Grosse Huelsewiesche](mailto:mihuelsewiesche@twilio.com) | Approved |  |
| [Dr. Sneed](mailto:bsneed@twilio.com) | Approved |  |
| [Valerii Batanov](mailto:vbatanov@twilio.com) | Approved |  |
| [Wenxi Zeng](mailto:wzeng@twilio.com) | Approved |  |
| Person | Not started |  |

# Objective

The purpose of this document is to serve as the source of truth for handling non-200 OK TAPI Response Codes for all currently active analytics SDKs. This document will define how SDKs should handle scenarios such as rate-limiting errors and exponential backoff.

This document considers the architecture of the following libraries:

* analytics-swift  
* analytics-kotlin  
* analytics-next  
* analytics-react-native

Other libraries should also be able to implement the prescribed changes. Server libraries will be covered by a separate SDD.

# Goals

Goals for this document

| Priority | Description | Status |
| :---- | :---- | :---- |
| highest | Full Signoff of document | Pending |
|  |  |  |

# Background

Over the last few years, TAPI (our tracking endpoint) has occasionally been overwhelmed by massive amounts of data. This has caused service degradation for our clients and generated SEVs for the organization.

Additionally, slow clients (devices with poor network connectivity or limited bandwidth) can cause repeated failed uploads. When uploads timeout or fail due to client-side network issues, SDKs without proper retry logic may continuously attempt to re-upload the same batches, creating additional load on TAPI and preventing the client from successfully delivering events. This compounds the problem during peak load periods.

To address these issues, the server-side team has proposed measures to:

1. Allow devices to retry later using the Retry-After header.  
2. Implement exponential backoff for certain errors.  
3. Properly handle timeout and transient errors to prevent aggressive retry behavior from slow clients.

The living document for this information is located here:

* [Client \<\> TAPI Statuscode Agreements](https://docs.google.com/document/d/1CQNvh8kIZqDnyJP5et7QBN5Z3mWJpNBS_X5rYhofmWc/edit?usp=sharing)

This document solidifies those suggestions into a pass/fail set of tests that must be added to the SDKs to confirm compliance with TAPI response code requirements.

# Approach

We will add support for both exponential backoff and 429 rate-limiting using a hybrid strategy that distinguishes between:

* **429 Rate Limiting**: Affects the entire upload pipeline (global wait)  
* **Transient Errors (5xx, 408, etc.)**: Applied per-batch with exponential backoff

This implementation will be:

* **Configurable**: Allow developers to adjust retry limits and backoff parameters via the Settings object, which is dynamically fetched from the Segment CDN. This ensures that configurations can be updated without requiring code changes or redeployments.  
* **Integrable**: Easily integrated into existing SDKs.  
* **Testable**: Designed with unit tests to ensure compliance with the rules outlined above.

By leveraging the Settings object, the retry and backoff logic can adapt dynamically to changes in server-side configurations, providing greater flexibility and control.

# Requirements

## Key Agreements

This section explicitly outlines the agreements between the client SDKs and the TAPI server, as referenced in the TAPI documentation. These agreements ensure consistent handling of HTTP response codes across all SDKs.

| Agreement | Description |  |
| :---- | :---- | ----- |
| HTTP Authorization Header | The SDKs will include the writekey in the Authorization header, as has been done historically. |  |
| HTTP X-Retry-Count Header | The SDKs will set the X-Retry-Count header for all requests to upload events. The value will start at 0 for initial requests For retries, send the per-file retry count if available, otherwise send the global retry count Global counter increments on 429 responses Per-file counter increments on retryable errors for that specific batch Both counters reset: global on any successful upload, per-file when that specific file succeeds |  |
| Upload Loop | The SDKs will process batch files sequentially. 429 responses cause immediate halt of the upload loop (remaining batches are not processed) Transient errors (5xx, 408, etc.) are handled per-batch without blocking other batches Uploads respect Retry-After and exponential backoff rules |  |
| Retry-After | The SDKs will adhere to the Retry-After time specified in the server response. The retry time is usually less than 1 minute, with a maximum cap of 300 seconds. 429 responses with Retry-After put the entire pipeline in a rate-limited state |  |
| Error Handling Tables | The SDKs will adhere to the error handling rules outlined in the tables for 4xx and 5xx HTTP response codes below. These rules include whether to retry, drop events, or apply exponential backoff based on the specific status code |  |

.

By adhering to these agreements, the SDKs ensure reliable and consistent communication with the TAPI server, minimizing the risk of overloading the server while maintaining robust error handling.

## 4xx — Client Errors

These usually indicate that the request should not be retried unless the failure is transient or the request can be fixed.

| Code | Meaning | Retry | Notes |
| :---- | :---- | :---- | :---- |
| 400 | Bad Request \- Invalid syntax | No | Drop these events entirely Data Loss |
| 401 | Unauthorized \- Missing/invalid auth | No | Drop these events entirely Data Loss |
| 403 | Forbidden \- Access denied | No | Drop these events entirely Data Loss |
| 404 | Not Found \- Resource missing | No | Drop these events entirely Data Loss |
| 408 | Request Timeout \- Server timed out waiting | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 410 | Resource no longer available | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 413 | Payload too large | No | Drop these events |
| 422 | Unprocessable Entity | No | Returned when max retry count is reached (based on X-Retry-Count) Data Loss |
| 429 | Too Many Requests | Yes | Retry based on Retry-After value in response header**Blocks entire pipeline** |
| 460 | Client timeout shorter than ELB idle timeout | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 4xx | Default | No | Drop these events entirely Data Loss |

## 5xx — Server Errors

These typically indicate transient server-side problems and are usually retryable.

| Code | Meaning | Retry | Notes |
| :---- | :---- | :---- | :---- |
| 500 | Internal Server Error | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 501 | Not Implemented | No | Drop these events entirely Data Loss |
| 502 | Bad Gateway | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 503 | Service Unavailable | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 504 | Gateway Timeout | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 505 | HTTP Version Not Supported | No | Drop these events entirely Data Loss |
| 508 | Loop Detected | Yes | Exponential Backoff \+ Max-retry (per-batch) |
| 511 | Network Authentication Required | Maybe | Authenticate, then retryif library supports OAuth |
| 5xx | Default | Yes | Exponential Backoff \+ Max-retry (per-batch) |

## Configuration Mapping

The behavior described in the tables above maps to the Settings configuration as follows:

### Default behaviors:

* ***default4xxBehavior***: "drop" \- Most 4xx errors result in immediate batch deletion  
* ***default5xxBehavior***: "retry" \- Most 5xx errors trigger exponential backoff

### Required overrides (exceptions to defaults):

* 4xx codes that should retry: 408, 410, 429, 460  
* 5xx codes that should drop: 501, 505

### Special cases:

* 429: Handled by rateLimitConfig when enabled, otherwise follows override behavior  
* 413: Not currently configured (implementation-dependent behavior)  
* 511: Not currently configured (implementation-dependent, may need OAuth support)

These mappings are encoded in the statusCodeOverrides configuration parameter, allowing server-side updates to error handling behavior without SDK changes.

## Exponential Backoff

The max retry duration and count must be long enough to cover several hours of sustained retries during a serious or extended TAPI outage.

### Backoff Formula

The backoff time is calculated using exponential backoff with jitter:

```kotlin
backoffTime = min(baseBackoffInterval * 2^retryCount, maxBackoffInterval) + jitter
```

Where:

* ***baseBackoffInterval***: Initial backoff interval (default: 0.5 seconds)  
* ***retryCount***: Number of retry attempts for this batch  
* ***maxBackoffInterval***: Maximum backoff interval cap (default: 300 seconds)  
* ***jitter***: Random value to prevent thundering herd (0 to 10% of calculated backoff time)

## Max Total Backoff Duration

In addition to the per-retry backoff calculation, batches are subject to a total retry duration limit:

* When a batch first fails with a retryable error, firstFailureTime is recorded in the metadata  
* On each subsequent retry attempt, check: currentTime \- firstFailureTime \> maxTotalBackoffDuration  
* If the duration is exceeded, the batch is dropped regardless of the retry count  
* This ensures batches don't remain in retry indefinitely during extended outages  
* Applies to both rate-limited (429) and transient error (5xx, 408, etc.) scenarios

## Configuration via Settings Object

To ensure flexibility and avoid hardcoded configurations, the retry and backoff logic should be configurable through the Settings object. This object is dynamically fetched from the Segment CDN during library startup, allowing updates to be applied without requiring code changes or redeployments.

### Key Configuration Parameters

The following parameters should be added to the Settings object:

#### Rate Limit Configuration (for 429 responses)

* ***enabled***: Enable/disable rate limit retry logic (default: true). When false, reverts to legacy behavior: ignore Retry-After, try all batches on every flush, never drop due to retry limits.  
* ***maxRetryCount***: The maximum number of retry attempts for rate-limited requests (default: 100\)  
* ***maxRetryInterval***: The maximum retry interval time the SDK will use from Retry-After header (default: 300 seconds)  
* ***maxRateLimitDuration***: The maximum total time (in seconds) a batch can remain in retry mode before being dropped (default: 43200 / 12 hours)

#### Backoff Configuration (for transient errors)

* ***enabled***: Enable/disable backoff retry logic for transient errors (default: true). When false, reverts to legacy behavior: no exponential backoff delays, try all batches on every flush, never drop due to retry limits.  
* ***maxRetryCount***: The maximum number of retry attempts per batch (default: 100\)  
* ***baseBackoffInterval***: The initial backoff interval in seconds (default: 0.5 seconds)  
* ***maxBackoffInterval***: The maximum backoff interval in seconds (default: 300 seconds / 5 minutes)  
* ***maxTotalBackoffDuration***: The maximum total time (in seconds) a batch can remain in retry mode before being dropped (default: 43200 / 12 hours)  
* ***jitterPercent***: The percentage of jitter to add to backoff calculations (default: 10, range: 0-100)  
* ***default4xxBehavior***: Default behavior for 4xx responses (default: "drop"). Valid values: "drop" (delete batch), "retry" (apply backoff)  
* ***default5xxBehavior***: Default behavior for 5xx responses (default: "retry"). Valid values: "drop" (delete batch), "retry" (apply backoff)  
* ***statusCodeOverrides***: Map of specific HTTP status codes to behaviors, overriding the default 4xx/5xx behavior (default: see example below)

### Example Settings Object

```json
{
  "httpConfig": {
    "rateLimitConfig": {
      "enabled": true,
      "maxRetryCount": 100,
      "maxRetryInterval": 300,
      "maxRateLimitDuration": 43200
    },
    "backoffConfig": {
      "enabled": true,
      "maxRetryCount": 100,
      "baseBackoffInterval": 0.5,
      "maxBackoffInterval": 300,
      "maxTotalBackoffDuration": 43200,
      "jitterPercent": 10,
      "default4xxBehavior": "drop",
      "default5xxBehavior": "retry",
      "statusCodeOverrides": {
        "408": "retry",
        "410": "retry",
        "429": "retry",
        "460": "retry",
        "501": "drop",
        "505": "drop"
      }
    }
  }
}
```

### Status Code Behavior Resolution

When determining how to handle an HTTP response code, the SDK uses the following precedence:

1. Check ***statusCodeOverrides***: If the specific status code is in the overrides map, use that behavior  
2. Check 429 special handling: If code is 429 and ***rateLimitConfig.enabled*** \= true, use rate limiting logic (regardless of overrides)  
3. Check default behavior: Use ***default4xxBehavior*** for 4xx codes or ***default5xxBehavior*** for 5xx codes  
4. Unknown codes: For codes outside 4xx/5xx range, treat as non-retryable (drop)

#### Example lookups:

* 503: Not in overrides → Check ***default5xxBehavior*** → "retry" → Apply exponential backoff  
* 501: In overrides → "drop" → Delete batch immediately  
* 400: Not in overrides → Check ***default4xxBehavior*** → "drop" → Delete batch immediately  
* 408: In overrides → "retry" → Apply exponential backoff  
* 429: Special handling via ***rateLimitConfig*** (if enabled), otherwise check overrides

### Integration

1. Fetch Settings: The library should fetch the Settings object from the Segment CDN during startup.  
2. Apply Configurations: Use the values from the ***rateLimitConfig*** and ***backoffConfig*** sections to initialize the retry and backoff logic.  
3. Fallback Defaults: If the config sections are missing or incomplete, fallback to the default values.  
4. Config Validation: Validate configuration values on load and clamp to safe ranges:  
   1. ***maxBackoffInterval***: 0.1s to 86400s (24 hours)  
   2. ***baseBackoffInterval***: 0.1s to 300s (5 minutes)  
   3. ***maxTotalBackoffDuration***: 60s (1 minute) to 604800s (7 days)  
   4. ***jitterPercent***: 0 to 100  
   5. Log warnings when values are clamped  
5. Legacy Mode Fallback: When enabled is set to false, revert to current SDK behavior:  
   1. ***rateLimitConfig.enabled*** \= false:  
      1. Ignore global RATE\_LIMITED state  
      2. Ignore Retry-After headers from 429 responses  
      3. Try all batch files on every flush  
      4. Never drop batches due to retry count or duration limits  
   2. ***backoffConfig.enabled*** \= false:  
      1. Ignore per-batch nextRetryTime checks  
      2. No exponential backoff delays  
      3. Try all batch files on every flush  
      4. Never drop batches due to retry count or duration limits  
   3. Both disabled: Complete legacy behavior \- try everything on every flush, keep files on 429/5xx, delete only on 4xx (not 429\)  
   4. Use case: Emergency escape hatch if retry logic has bugs, or to ensure event delivery during incidents

By making these parameters configurable, the SDK can adapt to changing requirements without requiring updates to the client application. The enabled flags provide a safety mechanism to revert to proven legacy behavior if issues arise with the new smart retry logic.

### Status Code Behavior Configuration

The combination of default behaviors and overrides provides flexibility:

* Add new override: Server-side can mark any status code as retryable or droppable without SDK updates  
* Change defaults: Flip ***default4xxBehavior*** or ***default5xxBehavior*** to change how most codes are handled  
* Handle new codes: TAPI can introduce new status codes (e.g., 418\) and they'll follow the default 4xx behavior automatically  
* Emergency response: If a specific status code causes issues, add it to overrides to change behavior immediately

#### Use cases:

* TAPI introduces a new error code 470 → Automatically follows ***default4xxBehavior***  
* Code 503 becomes non-transient → Add "503": "drop" to overrides  
* Testing: Temporarily mark 500 as non-retryable → Add "500": "drop" to overrides

### Retry Duration Calculation

With default values:

* ***maxRetryCount***: 100  
* ***maxBackoffInterval***: 300 seconds (5 minutes)  
* ***maxTotalBackoffDuration***: 43200 seconds (12 hours)

#### Retry limit enforcement:

Batches will be dropped when either limit is reached (whichever comes first):

1. Count-based limit: After 100 retry attempts  
2. Time-based limit: After 12 hours since first failure

**Theoretical maximum backoff time** (if count limit hit first): \~8.3 hours

* First \~7 retries use exponential backoff: 0.5s, 1s, 2s, 4s, 8s, 16s, 32s  
* Remaining 93 retries use ***maxBackoffInterval***: 93 × 300s \= 27,900s (\~7.75 hours)  
* Plus jitter variations

**In practice**: The ***maxTotalBackoffDuration*** of 12 hours ensures a hard time-based cutoff. During extended TAPI outages (multiple hours), the time limit will likely trigger before the retry count is exhausted.

This dual-limit approach provides:

* Rapid recovery: Fast retries when service is quickly restored (count limit)  
* Bounded effort: Hard time limit during extended outages (duration limit)  
* Server-side control: Both limits can be adjusted via Settings object

# Architecture

The architecture for implementing exponential backoff and 429 rate-limiting includes the following components:

## Legacy vs. New Behavior

To understand what this design adds, it's important to clarify how the current SDK handles failed uploads:

### Current SDK Behavior (Legacy Mode)

```javascript
Flush triggered (every 30s or 20 events)
  ↓
Loop through all batch files
  ↓
Try to upload each file
  ↓
On failure:
  - 429 or 5xx → Keep file (passive retry on next flush)
  - 4xx (not 429) → Delete file (data loss)
  ↓
Done (no active retry scheduling)
```

####  Key characteristics:

* No delay between retries (every flush attempts every file)  
* No limits on retry attempts (batches retry indefinitely)  
* No respect for Retry-After headers  
* No backoff to reduce load during outages  
* Simple and predictable, but can overwhelm TAPI during incidents

### New Smart Retry Behavior

This design adds intelligent skip conditions without changing the fundamental "try on flush" model:

```javascript
Flush triggered
  ↓
Check: Is pipeline RATE_LIMITED? → Yes? Skip ALL files
  ↓
Loop through batch files:
  ↓
  For each file:
    Check: Has nextRetryTime passed? → No? Skip THIS file
    Check: Max retries exceeded? → Yes? Delete file
    Check: Max duration exceeded? → Yes? Delete file
  ↓
  Try to upload
```

#### Key improvements:

* Respects Retry-After headers (429 blocks all uploads)  
* Exponential backoff (reduces load during outages)  
* Bounded retry attempts (prevents infinite retries)  
* Time-based limits (drops very old failed batches)  
* Configurable via Settings object (server-side control)

### Fallback to Legacy Mode

When ***rateLimitConfig.enabled*** \= false and ***backoffConfig.enabled*** \= false, the SDK reverts completely to legacy behavior. This provides:

* **Safety**: If smart retry logic has bugs, flip the switch  
* **Data preservation**: Never drop events due to retry logic issues  
* **Emergency escape hatch**: Ensure event delivery during incidents

### Hybrid Retry Strategy

The system distinguishes between two types of failures:

#### 429 Rate Limiting → Global Pipeline State

* **Behavior**: All uploads pause until Retry-After time passes  
* **Rationale**: Server is signaling "this client is sending too much" \- respect the rate limit across all batches  
* **State**: Global pipeline enters RATE\_LIMITED state with waitUntilTime  
* **Impact**: Blocks ALL batch uploads until the wait time expires  
* **Processing**: When 429 is received, immediately stop processing remaining batches in the current upload iteration

#### Transient Errors (5xx, 408, 410, 460\) → Per-Batch Backoff

* **Behavior**: Only the failing batch is retried with exponential backoff  
* **Rationale**: These are batch-specific transient issues, not client-wide rate limiting  
* **State**: Per-batch metadata tracks retryCount and nextRetryTime  
* **Impact**: Other batches continue uploading normally  
* **Processing**: Failed batch is skipped, but remaining batches in the upload iteration continue to be processed

## State Machine

The state machine is responsible for managing the upload pipeline's global state for rate limiting.

### States

| State | Description |
| :---- | :---- |
| READY | The pipeline is ready to upload. |
| RATE\_LIMITED | The pipeline is waiting due to a 429 response. Contains a ***waitUntilTime***. |

### Transitions 

| Current State | Event | Next State | Action |
| :---- | :---- | :---- | :---- |
| READY | 2xx | READY | Continue processing batches |
| READY | 429 | RATE\_LIMITED | Set waitUntilTime based on Retry-After header, stop processing remaining batches |
| READY | 5xx/408/410/460 | READY | Update per-batch metadata with backoff time, continue processing remaining batches |
| READY | 4xx (not 429\) | READY | Drop batch file and metadata, continue processing remaining batches |
| RATE\_LIMITED | Upload triggered (time NOT passed) | RATE\_LIMITED | Skip all uploads, remain in waiting state |
| RATE\_LIMITED | Upload triggered (time passed) \+ 2xx | READY | Reset global state, continue processing batches |
| RATE\_LIMITED | Upload triggered (time passed) \+ 429 | RATE\_LIMITED | Update waitUntilTime with new Retry-After value, stop processing remaining batches |
| RATE\_LIMITED | Upload triggered (time passed) \+ 5xx/408/410/460 | READY | Transition to per-batch backoff for that file, continue processing remaining batches |
| RATE\_LIMITED | Upload triggered (time passed) \+ 4xx (not 429\) | READY | Drop batch file and metadata, transition to READY, continue processing remaining batches |

### Per-Batch Retry Metadata

Each batch file has associated metadata stored in a companion file:

### Metadata Structure

```json
{
  "retryCount": 3,
  "nextRetryTime": 1234567890000,
  "firstFailureTime": 1234524890000
}
```

#### Fields

* ***retryCount***: Number of retry attempts for this batch  
* ***nextRetryTime***: Unix timestamp (milliseconds) when the next retry can be attempted  
* ***firstFailureTime***: Unix timestamp (milliseconds) when this batch first failed, used to enforce maxTotalBackoffDuration

#### File Naming Conventions

* Batch file: {writeKey}-{fileIndex} (e.g., segment-abc123-5)  
* Metadata file: {writeKey}-{fileIndex}.meta (e.g., segment-abc123-5.meta)  
* Location: Same directory as batch files  
* Format: JSON

#### Metadata Lifecycle

1. Creation: Metadata file is created when a batch first fails with a retryable error  
   1. Set ***retryCount*** to 1  
   2. Set ***firstFailureTime*** to current timestamp  
   3. Calculate ***nextRetryTime*** based on backoff formula  
2. Update: Updated on each retry attempt  
   1. Increment ***retryCount***  
   2. Calculate new ***nextRetryTime*** using exponential backoff  
   3. Keep ***firstFailureTime*** unchanged (tracks original failure time)  
3. Deletion:  
   1. Deleted when batch successfully uploads  
   2. Deleted when batch is dropped (max retries reached, max duration exceeded, or non-retryable error)  
   3. Deleted when enabled is false (kill switch active)  
4. Validation: On app restart, validate persisted values:  
   1. ***nextRetryTime*** is reasonable (not corrupted, not impossibly far in future)  
   2. ***firstFailureTime*** is reasonable and in the past  
   3. If validation fails, drop the batch

## Upload Gate

The concept of an upload gate replaces the need for traditional timers. Instead of setting timers to trigger uploads, the pipeline checks state and wait times whenever an upload is triggered (e.g., by a new event or flush policy).

### How It Works

1. Legacy Mode Check:  
   1. If both ***rateLimitConfig.enabled*** and ***backoffConfig.enabled*** are false:  
      1. Skip all smart retry logic below  
      2. Try to upload every batch file on every flush (current SDK behavior)  
      3. Keep files on failure (429/5xx), delete only on 4xx (not 429\)  
2. Global Rate Limiting Check (only if ***rateLimitConfig.enabled*** \= true):  
   1. If pipeline is in RATE\_LIMITED state and current time \< ***waitUntilTime***:  
      1. Skip ALL uploads, exit early  
   2. If current time ≥ ***waitUntilTime***:  
      1. Transiti	on to READY state, proceed with upload processing  
   3. If ***rateLimitConfig.enabled*** \= false:  
      1. Skip this check, pipeline always stays in READY state  
3. Per-Batch Processing:  
   1. For each batch file in the queue:  
      1. Load metadata file (if exists)  
      2. **Check duration limit** (only if backoffConfig.enabled \= true):  
         1. If firstFailureTime exists and currentTime \- firstFailureTime \> maxTotalBackoffDuration then drop this batch (delete file and metadata), continue to next batch  
      3. **Check retry count limit** (only if backoffConfig.enabled \= true):  
         1. If retryCount \>= maxRetryCount the drop this batch (delete file and metadata), continue to next batch  
      4. **Check backoff time** (only if backoffConfig.enabled \= true):  
         1. If nextRetryTime exists and current time \< nextRetryTime then skip this batch, continue to next batch  
      5. Otherwise:  
         1. Attempt upload  
         2. Handle response according to retry strategy  
4. Response Handling:  
   1. **2xx Success**: Delete batch file and metadata, reset counters  
   2. **429** (if ***rateLimitConfig.enabled*** \= true): Set global RATE\_LIMITED state, stop processing remaining batches  
   3. **429** (if ***rateLimitConfig.enabled*** \= false): Keep file, continue processing remaining batches  
   4. **5xx/408/410/460** (if ***backoffConfig.enabled*** \= true): Update batch metadata with backoff (increment retryCount, calculate nextRetryTime), continue to next batch  
   5. **5xx/408/410/460** (if ***backoffConfig.enabled*** \= false): Keep file without metadata, continue processing remaining batches  
   6. **4xx (not 429\)**: Delete batch file and metadata

### Advantages

* Simplifies implementation by removing the need for timers  
* Saves battery life on mobile devices  
* Prevents potential memory leaks from timer management  
* Ensures uploads are only attempted when triggered by an event or other external factor  
* Maintains sequential batch processing while respecting backoff and retry rules

By using an upload gate, the SDK ensures that uploads are managed efficiently and only occur when the pipeline is ready, without relying on timers to schedule retries.

## Persistence

Persistence ensures that both global pipeline state and per-batch retry metadata are retained across app restarts.

### Global State Persistence

The pipeline's global state should be persisted to local storage:

```json
{
  "state": "RATE_LIMITED",
  "waitUntilTime": 1234567890000,
  "globalRetryCount": 5
}
```

To be stored as is appropriate for each library.

# Implementation Steps

1. Fetch Settings: Load retry/backoff configuration from Settings object  
2. Initialize State: Load persisted global pipeline state (or default to READY)  
3. Upload Gate Check: Before each upload iteration, check global state  
4. Per-Batch Processing: For each batch, check metadata and skip if wait time not passed  
5. Response Handling: Update global state or per-batch metadata based on response  
6. Persist Changes: Save state and metadata changes immediately  
7. Logging: Log all state transitions, retry attempts, and backoff calculations

## Requirements

* The retry logic must be modular and testable  
* The integration must not block other SDK operations  
* The upload pipeline should operate independently on its existing coroutine/dispatcher  
* State transitions should be logged for debugging and monitoring  
* All file operations (reading/writing metadata) should be thread-safe

# Advice

* Ensure that the state machine is checked before every upload attempt  
* Use the Settings object to configure retry parameters dynamically  
* Log state transitions and retry attempts for debugging and monitoring  
* The retry logic must be modular and testable  
* The integration must not block other SDK operations, ensuring that the upload pipeline operates independently  
* Implement comprehensive unit tests covering all response codes and state transitions  
* Consider adding metrics/telemetry to monitor retry behavior in production  
* Validate all persisted timestamps on app restart to handle clock changes or corrupted data  
* Use jitter in backoff calculations to prevent thundering herd when many clients retry simultaneously  
* Implement status code behavior resolution with clear precedence: overrides → rate limiting (for 429\) → defaults → fallback  
* Log when status code overrides are applied to help debug unexpected retry behavior  
* When unknown status codes are encountered, log them prominently to identify gaps in configuration  
* Test the enabled=false fallback mode thoroughly to ensure it truly reverts to legacy behavior  
* Validate all Settings parameters on load and clamp to safe ranges to prevent misconfiguration

By following this architecture, the SDKs can implement robust and configurable retry and backoff mechanisms that align with the requirements outlined in this document.

