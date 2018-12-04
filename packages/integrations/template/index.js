var ReactNative = require('react-native')
var disabled =
	ReactNative.Platform.OS === 'ios'
		? '{{disable_ios}}' === 'true'
		: ReactNative.Platform.OS === 'android'
		? '{{disable_android}}' === 'true'
		: true

if (disabled) {
	module.exports = { disabled: true }
} else {
	var bridge = ReactNative.NativeModules['{{{nativeModule}}}']

	if (!bridge) {
		throw new Error('Failed to load {{{name}}} integration native module')
	}

	module.exports = bridge.setup
}
