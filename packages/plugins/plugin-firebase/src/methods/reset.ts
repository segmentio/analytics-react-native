import { firebaseAnalytics } from '../firebaseAnalytics';

export default async () => {
  await firebaseAnalytics.resetAnalyticsData();
};
