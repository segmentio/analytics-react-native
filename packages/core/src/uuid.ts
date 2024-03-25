// Note that we only import the type for Typescript purposes
// The library is import dynamically to detect if it's installed first
import type { v4 } from 'uuid';

let uuidv4: typeof v4 | undefined;
try {
  // Try getting
  require('react-native-get-random-values');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  uuidv4 = require('uuid')?.v4;
} catch (error) {
  console.warn(
    "Segment: Tried to use the default UUID Generator but couldn't find package react-native-get-random-values.\n\
        - Install 'react-native-get-random-values' to use the default UUID Generator\n\
        - You might be missing the 'uuidProvider' argument in your client configuration to use your own UUID generator\n\
        Execution will continue but will rely on an insecure UUID Generator. This warning will only show once."
  );
}

export const getUUID = (): string => {
  return uuidv4?.().toString() ?? insecureRandomValues();
};

const insecureRandomValues = (): string => {
  let d = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    // eslint-disable-next-line no-bitwise
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
};
