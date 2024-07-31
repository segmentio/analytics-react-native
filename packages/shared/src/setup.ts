// This is our basic setup for all JS Tests
jest.mock('react-native');
jest.mock('uuid');
jest.mock('react-native-get-random-values');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// jest.mock('NetInfoModule', () => require('../../shared/__mocks__/NetInfoModule'));

import { NativeModules } from 'react-native';
// Mock the NativeModules and NativeEventEmitter
NativeModules.NetInfoModule = {
  startNetworkListening: jest.fn(),
  stopNetworkListening: jest.fn(),
};

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return jest.fn().mockImplementation(() => {
    return {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      startNetworkListening: jest.fn(),
      stopNetworkListening: jest.fn(),
    };
  });
});
