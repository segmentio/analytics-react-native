import firebaseAnalytics from '@react-native-firebase/analytics';

export default async () => {
  await firebaseAnalytics().resetAnalyticsData();
};
