import React, { createContext, useContext } from 'react';

import { defaultConfig } from './constants';
import type { Config, ClientMethods } from './types';
import { createLogger } from './logger';
import { SegmentClient } from './analytics';
import { SovranStorage } from './storage';

export const createClient = (config: Config) => {
  const logger = config?.logger || createLogger();
  if (typeof config?.debug === 'boolean') {
    if (config.debug) {
      logger.enable();
    } else {
      logger.disable();
    }
  }
  const clientConfig = { ...defaultConfig, ...config };

  const segmentStore = new SovranStorage({
    storeId: config.writeKey,
    storePersistor: config.storePersistor,
    storePersistorSaveDelay: config.storePersistorSaveDelay,
  });

  const client = new SegmentClient({
    config: clientConfig,
    logger,
    store: segmentStore,
  });

  client.init();

  return client;
};

const Context = createContext<SegmentClient | null>(null);

export const AnalyticsProvider = ({
  client,
  children,
}: {
  client?: SegmentClient;
  children?: any;
}) => {
  if (!client) {
    return null;
  }

  return <Context.Provider value={client}>{children}</Context.Provider>;
};

export const useAnalytics = (): ClientMethods => {
  const client = useContext(Context);
  return React.useMemo(() => {
    if (!client) {
      console.error(
        'Segment client not configured!',
        'To use the useAnalytics() hook, pass an initialized Segment client into the AnalyticsProvider'
      );
    }

    return {
      screen: async (...args) => client?.screen(...args),
      track: async (...args) => client?.track(...args),
      identify: async (...args) => client?.identify(...args),
      flush: async () => client?.flush(),
      group: async (...args) => client?.group(...args),
      alias: async (...args) => client?.alias(...args),
      reset: async (...args) => client?.reset(...args),
    };
  }, [client]);
};
