import { createStore } from '@segment/sovran-react-native';
import { checkResponseForErrors } from './errors';
import { chunk } from './util';
import { libraryInfo } from './info';

export interface MetricsOptions {
  host?: string;
  sampleRate?: number;
  flushTimer?: number;
  maxQueueSize?: number;
}

type Metric = { type: 'Counter'; metric: string; value: number; tags: object };

// This is a set of the valid metric names,
// Metrics are filtered on TrackingAPI before sending to Datadog
// Names not here are not going to show up
type MetricNames =
  | 'invoke'
  | 'invoke.error'
  | 'integration.invoke'
  | 'integration.invoke.error';

// This is the prefix for all metrics, metrics without this prefix won't be tracked
const MetricNamePrefix = 'analytics_mobile';

export class Telemetry {
  private host: string;
  private flushTimer: number;
  private maxQueueSize: number;

  sampleRate: number;

  private intervalFlush: ReturnType<typeof setTimeout>;
  private isFlushing = false;
  private metricStore = createStore<Metric[]>([]);

  constructor(options?: MetricsOptions) {
    this.host = options?.host ?? 'api.segment.io/v1';
    this.sampleRate = options?.sampleRate ?? 1;
    this.flushTimer = options?.flushTimer ?? 30 * 1000; // 30 secs
    this.maxQueueSize = options?.maxQueueSize ?? 20;

    this.intervalFlush = setTimeout(() => {
      this.flush();
    }, this.flushTimer);
  }

  private isInSample(): Boolean {
    return Math.random() <= this.sampleRate;
  }

  increment(metric: MetricNames, tags: Record<string, string>) {
    // metrics endpoint apparently doesn't let things without tags
    if (Object.keys(tags).length === 0) {
      return;
    }

    if (!this.isInSample()) {
      return;
    }

    tags.library = libraryInfo.name;
    tags.library_version = libraryInfo.version;

    // TODO: Do we do any transformations?

    let item: Metric = {
      type: 'Counter',
      metric: `${MetricNamePrefix}.${metric}`,
      value: 1,
      tags: tags,
    };

    // Add the next event
    this.metricStore.dispatch((queue) => {
      let newQueue = [...queue, item];
      return newQueue;
    });

    // We send errors right away
    if (metric.includes('error')) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    const queue = await this.metricStore.getState(true);

    if (queue.length === 0) {
      return;
    }

    if (this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    const chunks = chunk(queue, this.maxQueueSize);
    const uploaded: Metric[] = [];

    for (const metrics of chunks) {
      const isSuccess = await this.upload(metrics);
      if (isSuccess) {
        metrics.concat(metrics);
      }
    }

    if (uploaded.length > 0) {
      this.metricStore.dispatch((queue) => {
        const setToRemove = new Set(uploaded);
        const filteredQueue = queue.filter((m) => !setToRemove.has(m));
        return filteredQueue;
      });
    }

    this.isFlushing = false;
  }

  cleanup() {
    if (this.intervalFlush) {
      clearTimeout(this.intervalFlush);
    }
  }

  private async upload(metrics: Metric[]): Promise<Boolean> {
    const payload = { series: metrics };

    const headers = { 'Content-Type': 'text/plain' };
    const url = `https://${this.host}/m`;

    try {
      const response = await fetch(url, {
        headers,
        body: JSON.stringify(payload),
        method: 'POST',
      });
      checkResponseForErrors(response);
    } catch (e) {
      // TODO: Logger
      console.error(e);
      return false;
    }
    return true;
  }
}
