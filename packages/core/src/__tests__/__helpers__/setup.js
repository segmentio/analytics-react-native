import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    ...mockAsyncStorage,

    setItem: async (...things) => {
      return new Promise((resolve, _) => resolve());
    },
  };
});
