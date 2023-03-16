import { createStore } from '@segment/sovran-react-native';
import { checkResponseForErrors } from '../errors';
import { allSettled, chunk } from '../util';

/**
 * Limit number of tags accepted by the server
 */
const TAGS_LIMIT = 10;

/**
 * We prioritize these tags over user defined ones if the number is over the limit, ordered by importance
 */
const PRIORITIZED_TAGS = [
  'writeKey',
  'message',
  'error',
  'device',
  'os',
  'libraryName',
  'libraryVersion',
];

/**
 * Metric JSON Object for the Metrics API
 */
type Metric = { type: 'Counter'; metric: string; value: number; tags: object };

/**
 * This is a set of the valid metric names
 * Metrics are filtered on Metrics API
 * Names not here won't show up in dashboards
 */
export type MetricNames =
  | 'invoke'
  | 'invoke.error'
  | 'integration.invoke'
  | 'integration.invoke.error';

/**
 * Common Prefix for all our metrics. Filtered by Metrics API.
 */
const METRIC_NAME_PREFIX = 'analytics_mobile';

/**
 * Options for the metics client.
 */
export interface MetricsOptions {
  host: string;
  flushTimer: number;
  maxQueueSize: number;
  sampleRate: number;
}

/**
 * This is a low level client for sending metrics to Segment, you should not use this directly, prefer TelemetryHelper
 */
export class Metrics {
  private settings?: MetricsOptions;
  private intervalFlush?: ReturnType<typeof setTimeout>;
  private isFlushing = false;
  private metricStore = createStore<Metric[]>([]);
  private pending: Metric[] = [];

  /**
   * Creates the metrics client, it won't start sending events until options are set or .configure() is
   * called directly to initialize with defaults.
   * Metrics before configuration will still be stored.
   * @param options C
   */
  constructor(options?: Partial<MetricsOptions>) {
    if (options !== undefined) {
      this.configure(options);
    }
  }

  /**
   * Call to configure the client with new options
   * @param options
   */
  async configure(options?: Partial<MetricsOptions>) {
    this.settings = {
      host: options?.host ?? 'api.segment.io/v1',
      sampleRate: options?.sampleRate ?? 0.1,
      flushTimer: options?.flushTimer ?? 30 * 1000, // 30 secs
      maxQueueSize: options?.maxQueueSize ?? 20,
    };

    await this.replay();

    clearTimeout(this.intervalFlush);
    this.startTimer();
  }

  /**
   * Starts the timer for uploading metrics
   */
  private startTimer() {
    if (this.settings !== undefined) {
      this.intervalFlush = setTimeout(async () => {
        await this.flush();
        this.startTimer();
      }, this.settings.flushTimer);
    }
  }

  /**
   * Determines if a metric is sampled or not.
   * Metrics not in sample won't be recorded and sent to the server
   * @returns true if metric will be sent
   */
  private isInSample(): Boolean {
    if (this.settings === undefined) {
      return false;
    }
    return Math.random() <= this.settings.sampleRate;
  }

  private limitNTagsByPriority(
    n: number,
    tags: Record<string, string>
  ): Record<string, string> {
    const keys = Object.keys(tags);
    if (keys.length <= n) {
      return tags;
    }

    let remaining: string[] = [];
    let sanitizedTags: Record<string, string> = {};
    let count = 0;
    for (const k of keys) {
      if (count < n && PRIORITIZED_TAGS.includes(k)) {
        sanitizedTags[k] = tags[k];
        count++;
        if (count >= n) {
          return sanitizedTags;
        }
      } else {
        remaining.push(k);
      }
    }

    if (count < n) {
      let nExtras = n - count;

      for (let index = 0; index < nExtras; index++) {
        let extraTag = remaining[index];
        sanitizedTags[extraTag] = tags[extraTag];
      }
    }

    return sanitizedTags;
  }

  /**
   * Increments a metric counter
   * @param metric metric to increase, use only valid Metric Names or it won't be accepted by the Metrics API
   * @param tags tags to attach to metric
   * @returns awaitable, true if metric is queued, false if invalid or not in sample
   */
  async increment(metric: MetricNames, tags: Record<string, string>) {
    // metrics endpoint apparently doesn't let things without tags
    if (Object.keys(tags).length === 0) {
      return false;
    }

    // To prevent errors and dropping bad metrics we will do some sanitization here before uploading
    tags = this.limitNTagsByPriority(TAGS_LIMIT, tags);

    let item: Metric = {
      type: 'Counter',
      metric: `${METRIC_NAME_PREFIX}.${metric}`,
      value: 1,
      tags: tags,
    };

    if (this.settings === undefined) {
      this.pending.push(item);
      return false;
    }

    return this.process(item);
  }

  private async process(metric: Metric) {
    if (!this.isInSample()) {
      return false;
    }
    // Add the next event
    await this.metricStore.dispatch((queue) => {
      let newQueue = [...queue, metric];
      return newQueue;
    });

    // We send errors right away
    if (metric.metric.includes('error')) {
      this.flush();
    }
    return true;
  }

  /**
   * Uploads all queued metrics to the MetricsAPI.
   * No retries on errors, metrics are dropped if the server reports an error or can't reach it
   */
  async flush(): Promise<void> {
    if (this.settings === undefined) {
      return;
    }

    const queue = await this.metricStore.getState(true);

    if (queue.length === 0) {
      return;
    }

    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    const chunks = chunk(queue, this.settings.maxQueueSize);
    let uploaded: Metric[] = [];

    for (const metrics of chunks) {
      await this.upload(metrics);
      // This is best effort only, if we are not successful sending metrics we won't retry
      uploaded = uploaded.concat(metrics);
    }

    if (uploaded.length > 0) {
      await this.metricStore.dispatch((queue) => {
        const setToRemove = new Set(uploaded);
        const filteredQueue = queue.filter((m) => !setToRemove.has(m));
        return filteredQueue;
      });
    }

    this.isFlushing = false;
  }

  /**
   * Replays queued events before first configuration
   */
  private async replay() {
    await allSettled(this.pending.map((metric) => this.process(metric)));
  }

  /**
   * Cleans up resources and cancels timers
   */
  async cleanup() {
    clearTimeout(this.intervalFlush);
    await this.metricStore.dispatch(() => []);
  }

  private async upload(metrics: Metric[]): Promise<Boolean> {
    if (this.settings === undefined) {
      return false;
    }

    const payload = { series: metrics };

    const headers = { 'Content-Type': 'text/plain' };
    const url = `https://${this.settings.host}/m`;
    try {
      const response = await fetch(url, {
        headers,
        body: JSON.stringify(payload),
        method: 'POST',
      });
      checkResponseForErrors(response);
    } catch (e) {
      return false;
    }
    return true;
  }
}
