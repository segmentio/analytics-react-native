# SDD: Handling TAPI Response Code in Analytics SDKs

# Reviewers

| Reviewer | Status | Comments |
| :---- | :---- | :---- |
| [Michael Grosse Huelsewiesche](mailto:mihuelsewiesche@twilio.com) | In progress |  |
| [Dr. Sneed](mailto:bsneed@twilio.com) | Not started |  |
| [Valerii Batanov](mailto:vbatanov@twilio.com) | In progress |  |
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
|  |  | Pending |
|  |  |  |
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
* ***maxTotalBackoffDuration***: The maximum total time (in seconds) a batch can remain in retry mode before being dropped (default: 43200 / 12 hours)

#### Backoff Configuration (for transient errors)

* ***enabled***: Enable/disable backoff retry logic for transient errors (default: true). When false, reverts to legacy behavior: no exponential backoff delays, try all batches on every flush, never drop due to retry limits.  
* ***maxRetryCount***: The maximum number of retry attempts per batch (default: 100\)  
* ***baseBackoffInterval***: The initial backoff interval in seconds (default: 0.5 seconds)  
* ***maxBackoffInterval***: The maximum backoff interval in seconds (default: 300 seconds / 5 minutes)  
* ***maxTotalBackoffDuration***: The maximum total time (in seconds) a batch can remain in retry mode before being dropped (default: 43200 / 12 hours)  
* ***jitterPercent***: The percentage of jitter to add to backoff calculations (default: 10, range: 0-100)  
* ***retryableStatusCodes***: A list of HTTP status codes that should trigger retries (e.g., 5xx, 408, 429\)

### Example Settings Object

```json
{
  ...
  "httpConfig": {
    "rateLimitConfig": {
      "enabled": true,
      "maxRetryCount": 100,
      "maxRetryInterval": 300,
      "maxTotalBackoffDuration": 43200
    },
    "backoffConfig": {
      "enabled": true,
      "maxRetryCount": 100,
      "baseBackoffInterval": 0.5,
      "maxBackoffInterval": 300,
      "maxTotalBackoffDuration": 43200,
      "jitterPercent": 10,
      "retryableStatusCodes": [408, 410, 429, 460, 500, 502, 503, 504, 508]
    }
  }
}

```

### Integration

1. **Fetch Settings**: The library should fetch the Settings object from the Segment CDN during startup.  
2. **Apply Configurations**: Use the values from the retryConfig section to initialize the retry and backoff logic.  
3. **Fallback Defaults**: If the retryConfig section is missing or incomplete, fallback to the default values.

By making these parameters configurable, the SDK can adapt to changing requirements without requiring updates to the client application.

# Architecture

The architecture for implementing exponential backoff and 429 rate-limiting includes the following components:

## State Machine

The state machine is responsible for managing the upload pipeline's state. It defines the states and transitions based on HTTP responses and retry logic.

### States

| State | Description |
| :---- | :---- |
| READY | The pipeline is ready to upload. |
| WAITING | The pipeline is waiting to retry. |

###  Transitions

| Current State | Event | Next State | Action |
| :---- | :---- | :---- | :---- |
| READY | 2xx | READY | Attempt upload |
| READY | 429 or 5xx | WAITING | Set waitUntilTime based off backoff/retry-after |
| WAITING | waitUntilTime reached | READY | Reset state and attempt upload |
| WAITING | 429 or 5xx | WAITING | Set waitUntilTime based off backoff/retry-after |

## Upload Gate

The concept of an upload gate replaces the need for a traditional timer. Instead of setting a timer to trigger uploads, the pipeline checks the state and waitUntilTime whenever an upload is triggered (e.g., by a new event).

### How It Works

* When an upload is triggered (e.g., a new event is added to the queue), the pipeline retrieves the current state from the state machine.  
* If the current time is past the waitUntilTime, the state machine transitions to READY, and the upload proceeds.  
* If the current time is before the waitUntilTime, the pipeline remains in the WAITING state, and the upload is deferred.

### Advantages

* Simplifies the implementation by removing the need for timers. This saves both battery life and prevents possible memory leaks on the devices due to using timers.  
* Ensures that uploads are only attempted when triggered by an event or other external factor.  
* Maintains the one-at-a-time upload loop while respecting backoff and retry rules.

By using an upload gate, the SDK ensures that uploads are managed efficiently and only occur when the pipeline is ready, without relying on timers to schedule retries.

## Persistence

Persistence ensures that the state machine's state and waitUntilTime are retained across app restarts. This is particularly useful for SDKs that support long-running applications.

### Options

* Persistent SDKs: Use local storage (e.g., UserDefaults, SQLite) to save the state and waitUntilTime.  
* In-Memory SDKs: If persistence is not possible (primarily Server SDKs that run in containers), the state resets on app restart, and the pipeline starts fresh.

### Guarantees

* Persistent SDKs must ensure that the saved state is consistent and does not lead to duplicate uploads.  
* The waitUntilTime must be validated to ensure it is not in the past upon app restart.  
* Integration  
* Integration involves embedding the retry and backoff logic into the SDK's upload pipeline.

## Advice

* Ensure that the state machine is checked before every upload attempt.  
* Use the Settings object to configure retry parameters dynamically.  
* Log state transitions and retry attempts for debugging and monitoring.  
* Requirements:  
*   
* The retry logic must be modular and testable.  
* The integration must not block other SDK operations, ensuring that the upload pipeline operates independently.

By following this architecture, the SDKs can implement robust and configurable retry and backoff mechanisms that align with the requirements outlined in this document.

