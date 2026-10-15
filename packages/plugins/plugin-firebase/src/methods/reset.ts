import { resetAnalyticsData } from '@react-native-firebase/analytics';
import { firebaseAnalytics } from '../firebaseAnalytics';

export default async () => {
  await resetAnalyticsData(firebaseAnalytics);
};
