import { NativeModules } from 'react-native'

import bridge = NativeModules.RNAnalytics

if (!bridge) {
	throw new Error('Failed to load Analytics native module.')
}

export default bridge
export type JsonMap = NativeModules.RNAnalytics.JsonMap
export type Bridge = typeof bridge
