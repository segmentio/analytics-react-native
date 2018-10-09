import { NativeModules } from 'react-native'

import bridge = NativeModules.RNAnalytics

export default bridge
export type JsonMap = NativeModules.RNAnalytics.JsonMap
export type Bridge = typeof bridge
