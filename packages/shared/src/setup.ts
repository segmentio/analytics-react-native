// This is our basic setup for all JS Tests
jest.mock('react-native');
jest.mock('uuid');
jest.mock('react-native-get-random-values');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@react-native-community/netinfo', () => {
  return {
    addEventListener: jest.fn((callback) => {
      // Simulate the initial state and subsequent changes
      callback({ isConnected: true });

      // Return an object with a remove method to simulate the subscription removal
      return {
        remove: jest.fn(),
      };
    }),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  };
});
