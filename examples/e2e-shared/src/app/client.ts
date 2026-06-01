import {
  createClient,
  CountFlushPolicy,
  SegmentClient,
} from '@segment/analytics-react-native';
import { Platform } from 'react-native';
import { Logger } from './plugins/Logger';

export const logger = new Logger();

type ClientChangeListener = (client: SegmentClient) => void;
type ErrorListener = (error: any) => void;

const clientListeners: ClientChangeListener[] = [];
const errorListeners: ErrorListener[] = [];

function buildClient(writeKey: string): SegmentClient {
  const useProxy = writeKey === 'yup';
  const client = createClient({
    writeKey,
    maxBatchSize: 1000,
    trackDeepLinks: true,
    trackAppLifecycleEvents: true,
    autoAddSegmentDestination: true,
    collectDeviceId: true,
    debug: true,
    errorHandler: (error: any) => {
      errorListeners.forEach((fn) => fn(error));
    },
    ...(useProxy
      ? {
          useSegmentEndpoints: true,
          proxy: Platform.select({
            ios: 'http://localhost:9091/v1',
            android: 'http://10.0.2.2:9091/v1',
          }),
          cdnProxy: Platform.select({
            ios: 'http://localhost:9091/v1',
            android: 'http://10.0.2.2:9091/v1',
          }),
        }
      : {}),
    flushPolicies: [new CountFlushPolicy(5)],
  });

  client.add({ plugin: logger });

  const originalFlush = client.flush.bind(client);
  client.flush = async () => {
    await originalFlush();
    logger.markAllSent();
  };

  return client;
}

export let segmentClient = buildClient('yup');

export function reconnect(writeKey: string) {
  segmentClient = buildClient(writeKey);
  clientListeners.forEach((fn) => fn(segmentClient));
}

export function onClientChange(listener: ClientChangeListener): () => void {
  clientListeners.push(listener);
  return () => {
    const i = clientListeners.indexOf(listener);
    if (i >= 0) clientListeners.splice(i, 1);
  };
}

export function onError(listener: ErrorListener): () => void {
  errorListeners.push(listener);
  return () => {
    const i = errorListeners.indexOf(listener);
    if (i >= 0) errorListeners.splice(i, 1);
  };
}
