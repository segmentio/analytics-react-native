import {runAnalyticsTests} from '../../shared-e2e/src';

/**
 * E2E tests for E2E-compat (React Native 0.72.9 + React 18.3.1)
 * Using shared test suite from @segment/analytics-react-native-e2e-tests
 */
runAnalyticsTests('AnalyticsReactNativeE2E');
