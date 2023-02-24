import Braze from '@braze/react-native-sdk';

export default () => {
  Braze.requestImmediateDataFlush();
};
