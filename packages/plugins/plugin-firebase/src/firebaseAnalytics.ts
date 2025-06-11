import { getAnalytics } from '@react-native-firebase/analytics';
import { getApp } from '@react-native-firebase/app';

export const firebaseAnalytics = getAnalytics(getApp());
