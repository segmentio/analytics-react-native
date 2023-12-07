// This is our basic setup for all JS Tests
jest.mock('react-native');
jest.mock('uuid');
jest.mock('react-native-get-random-values');
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
