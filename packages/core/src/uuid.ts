import { v4 as uuidv4 } from 'uuid';

// `uuid` relies on a `crypto.getRandomValues` implementation, which React Native
// does not provide out of the box. `react-native-get-random-values` is the
// canonical polyfill, but it is an optional peer dependency: consumers may
// already polyfill `crypto.getRandomValues` themselves. We attempt to load it
// here, but never hard fail at import time so those apps keep working without it
// installed. (Metro treats requires inside a try/catch as optional, so this does
// not break bundling when the package is absent.)
declare const require: (module: string) => unknown;

try {
  require('react-native-get-random-values');
} catch {
  // No-op: a `crypto.getRandomValues` polyfill may already be installed globally.
}

export const getUUID = (): string => {
  try {
    return uuidv4().toString();
  } catch {
    throw new Error(
      "@segment/analytics-react-native requires a 'crypto.getRandomValues' " +
        "polyfill, which doesn't appear to be installed. Install " +
        "'react-native-get-random-values' and import before " +
        'initializing the analytics client.'
    );
  }
};
