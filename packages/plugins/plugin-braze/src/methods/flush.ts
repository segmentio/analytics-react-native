import ReactAppboy from 'react-native-appboy-sdk';

export default () => {
  ReactAppboy.requestImmediateDataFlush();
};
