var ReactNative = require('react-native')
var disabled =
    ReactNative.Platform.OS === 'ios'
        ? '{{disable_ios}}' === 'true'
        : ReactNative.Platform.OS === 'android'
            ? '{{disable_android}}' === 'true'
            : true

module.exports = disabled
    ? {disabled: true}
    : ReactNative.NativeModules['{{{nativeModule}}}'].setup
