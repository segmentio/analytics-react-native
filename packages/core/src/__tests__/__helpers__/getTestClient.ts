import type { Persistor } from 'redux-persist';
import { SegmentClient } from '../../analytics';
import { Logger } from '../../logger';
import type { MainState } from '../../store/main';
import { ReduxStorage } from '../../storage';
import type { SystemState } from '../../store/system';
import type { UserInfoState } from '../../store/userInfo';
import type { Config } from '../../types';
import { mockPersistor } from './mockPersistor';

jest.mock('../../context');
jest.mock('react-native');

const getMockLogger = () => {
  const logger = new Logger();
  logger.disable();
  logger.info = jest.fn();
  logger.warn = jest.fn();
  logger.error = jest.fn();
  return logger;
};

// We set the persistor to initialized
mockPersistor.getState = jest.fn().mockReturnValue({
  bootstrapped: true,
});

/**
 * Creates a Redux Store compliant with the SegmentStore interface that can be used for testing in jest
 * @param state State to return from the Redux Store, defaults to a valid empty state
 * @returns a Redux Store instance
 */
export const getMockReduxStorage = (
  state?: Partial<{
    main: MainState;
    system: SystemState;
    userInfo: UserInfoState;
  }>
) => {
  return new ReduxStorage(
    {
      subscribe: jest.fn(),
      dispatch: jest.fn(),
      // @ts-ignore Ignore the type cause ReduxToolkit state type has a bunch of internals we don't need
      getState: () => ({
        userInfo: {
          anonymousId: 'my-id',
          userId: 'user-id',
        },
        main: {
          events: [],
          context: {
            app: {
              build: '1',
              version: '1.2',
            },
          },
        },
        system: {
          settings: {
            integrations: {},
          },
        },
        ...state,
      }),
    },
    mockPersistor
  );
};

/**
 * Creates a segment client with default settings that can be used for testing in jest
 * @param configOverride overrides any of the params in SegmentClient constructor
 * @returns a SegmentClient instance for testing
 */
export const getTestClient = (
  configOverride?: Partial<{
    config: Config;
    logger: Logger;
    store: any;
    persistor: Persistor;
  }>
) => {
  const clientArgs = {
    config: {
      writeKey: 'SEGMENT_KEY',
      flushAt: 10,
      retryInterval: 40,
    },
    logger: getMockLogger(),
    persistor: mockPersistor,
    store: getMockReduxStorage(),
    ...configOverride,
  };
  return new SegmentClient(clientArgs);
};
