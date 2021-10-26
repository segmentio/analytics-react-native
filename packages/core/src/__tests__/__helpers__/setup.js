import mockAsyncStorage from '@react-native-community/async-storage/jest/async-storage-mock';

jest.mock('@react-native-community/async-storage', () => {
  return {
    ...mockAsyncStorage,

    setItem: async (...things) => {
      return new Promise((resolve, _) => resolve());
    },
  };
});
