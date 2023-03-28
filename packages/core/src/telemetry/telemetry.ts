import type { Watchable } from '../storage';
import type { Context, DeepPartial } from '../types';
import { Metrics, MetricsOptions, MetricNames } from './metrics';
import { libraryInfo } from '../info';

const UNKNOWN_TAG_VALUE = 'unknown';

/**
 * Metric Tags
 */
export type Tags = Record<string, string>;

/**
 * Suggested Tags for a Metric recorded
 */
export type RecordTags = Tags & {
  // Add any common log tags here
  caller?: string;
};

/**
 * Suggested Tags for an error recorded
 */
export type ErrorTags = Tags & {
  // Add any common error tags here
  errorCode?: string;
};

/**
 * Interface for using the Telemetry object for recording events or errors
 */
export interface TelemetryRecorder {
  record: (message: string, tags?: RecordTags) => Promise<boolean>;
  error: (errorMessage: string, tags?: RecordTags) => Promise<boolean>;
}

/**
 * Telemetry object for the analytics client.
 * It uses the client's configuration and auto injects relevant information to the metrics.
 */
export class Telemetry implements TelemetryRecorder {
  private isEnabled: boolean = true;
  private metrics = new Metrics();
  private writeKey: string;
  private context: Watchable<DeepPartial<Context> | undefined>;
  private options?: Partial<MetricsOptions>;

  /**
   * Creates the telemetry object
   * It won't send any telemetry until `.configure` is explicitely called to give time to the client to initialize and
   * try to load settings
   * @param writeKey workspace writekey
   * @param context observable device context
   * @param isEnabled true by default
   */
  constructor(
    writeKey: string,
    context: Watchable<DeepPartial<Context> | undefined>,
    isEnabled: boolean = true
  ) {
    this.writeKey = writeKey;
    this.context = context;
    this.isEnabled = isEnabled;
  }

  /**
   * Enables telemetry, metrics will start recording
   */
  enable() {
    this.isEnabled = true;
    this.metrics.configure(this.options);
  }

  /**
   * Disables telemetry, no metrics will be recorded from now on
   */
  disable() {
    this.isEnabled = false;
    this.metrics.cleanup();
  }

  /**
   * Configures the metrics object. Until this method is called it will start uploading metrics.
   * @param options Metrics Options
   */
  async configure(options?: Partial<MetricsOptions>) {
    this.options = options;
    if (this.isEnabled) {
      await this.metrics.configure(options);
    }
  }

  private async injectTags(
    tags: Record<string, string>
  ): Promise<Record<string, string>> {
    const current = await this.context.get(true);
    return {
      ...tags,
      writeKey: this.writeKey,
      device: `${current?.device?.type ?? UNKNOWN_TAG_VALUE}-${
        current?.device?.model ?? UNKNOWN_TAG_VALUE
      }`,
      os: `${current?.os?.name ?? UNKNOWN_TAG_VALUE}-${
        current?.os?.version ?? UNKNOWN_TAG_VALUE
      }`,
      libraryName:
        current?.library?.name ?? libraryInfo.name ?? UNKNOWN_TAG_VALUE,
      libraryVersion:
        current?.library?.version ?? libraryInfo.version ?? UNKNOWN_TAG_VALUE,
    };
  }

  private async increment(metric: MetricNames, userTags: RecordTags = {}) {
    const injectedTags = await this.injectTags(userTags);
    return this.metrics.increment(metric, injectedTags);
  }

  private async recordInternal(
    metric: MetricNames,
    message: string,
    userTags: RecordTags = {}
  ) {
    if (!this.isEnabled) {
      return false;
    }

    let allTags = {
      ...userTags,
      message: message,
    };
    return this.increment(metric, allTags);
  }

  private async errorInternal(
    metric: MetricNames,
    error: string,
    userTags: RecordTags = {}
  ) {
    if (!this.isEnabled) {
      return false;
    }

    let allTags = {
      ...userTags,
      error: error,
    };
    return this.increment(metric, allTags);
  }

  /**
   * Records that an operaton has ocurred
   * @param message message
   * @param tags additional info
   */
  async record(message: string, tags: RecordTags = {}) {
    return this.recordInternal('invoke', message, tags);
  }

  /**
   * Records that an error has ocurred
   * @param error error message
   * @param tags additional info
   */
  async error(error: string, tags: ErrorTags = {}) {
    return this.errorInternal('invoke.error', error, tags);
  }

  /**
   * Creates a version of the telemetry that can be used by plugins with the proper info populated
   * @param plugin plugin name
   * @returns TelemetryObject limited for recording plugin metrics
   */
  getTelemetryForPlugin(plugin: string): TelemetryRecorder {
    let record = (message: string, tags: RecordTags = {}) => {
      return this.recordInternal('integration.invoke', message, {
        ...tags,
        plugin,
      });
    };
    let error = (errorMessage: string, tags: RecordTags = {}) => {
      return this.errorInternal('integration.invoke.error', errorMessage, {
        ...tags,
        plugin,
      });
    };

    return {
      record,
      error,
    };
  }

  async cleanup() {
    await this.metrics.cleanup();
  }
}
