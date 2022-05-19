import React, { createContext, useContext } from 'react';

import { defaultConfig } from './constants';
import type { Config, ClientMethods } from './types';
import { createLogger } from './logger';
import { SegmentClient } from './analytics';
import { SovranStorage } from './storage';

export const createClient = (config: Config) => {
  const logger = createLogger();
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
  if (!client) {
    console.error(
      'Segment client not configured!',
      'To use the useAnalytics() hook, pass an initialized Segment client into the AnalyticsProvider'
    );

    // @ts-ignore
    return {};
  }
  return {
    screen: (...args) => client.screen(...args),
    track: (...args) => client.track(...args),
    identify: (...args) => client.identify(...args),
    flush: () => client.flush(),
    group: (...args) => client.group(...args),
    alias: (...args) => client.alias(...args),
    reset: (...args) => client.reset(...args),
  };
};
