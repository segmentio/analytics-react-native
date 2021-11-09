import React, { createContext, useContext } from 'react';
import { PersistGate } from 'redux-persist/integration/react';

import { defaultConfig } from './constants';
import type { Config, ClientMethods } from './types';
import { createLogger } from './logger';
import { initializeStore } from './store';
import { SegmentClient } from './analytics';
import { actions } from './store';

const doClientSetup = async (client: SegmentClient) => {
  // make sure the persisted store is fetched
  await client.bootstrapStore();

  // get destination settings
  await client.fetchSettings();

  // flush any stored events
  client.flush();
  client.flushRetry();

  client.configure();

  // set up the timer/subscription for knowing when to flush events
  client.setupInterval();
  client.setupStoreSubscribe();

  // set up tracking for lifecycle events
  client.setupLifecycleEvents();

  // check if the app was opened from a deep link
  await client.trackDeepLinks();

  // save the current installed version
  await client.checkInstalledVersion();
};

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
  const { store, persistor } = initializeStore(config.writeKey);

  const client = new SegmentClient({
    config: clientConfig,
    logger,
    store,
    actions,
    persistor,
  });

  doClientSetup(client);

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

  return (
    <Context.Provider value={client}>
      <PersistGate loading={null} persistor={client.persistor}>
        {children}
      </PersistGate>
    </Context.Provider>
  );
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
    reset: () => client.reset(),
  };
};

export type SegmentClientContext = typeof SegmentClient.prototype;
