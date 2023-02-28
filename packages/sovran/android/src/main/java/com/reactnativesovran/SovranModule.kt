package com.sovranreactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name="Sovran")
class SovranModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  var onInitialized: () -> Unit = {}; 

  override fun getName(): String {
    return "Sovran"
  }

  companion object {
    const val ON_STORE_ACTION = "onStoreAction"
  }

  override fun getConstants() = mapOf(
      "ON_STORE_ACTION" to ON_STORE_ACTION
  )

  override fun initialize() {
    super.initialize()
    onInitialized()
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  fun addListener(eventName: String?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  @ReactMethod
  fun removeListeners(count: Int?) {
    // Keep: Required for RN built in Event Emitter Calls.
  }

  fun dispatch(action: String, payload: Map<String, Any?>) {
    val map = mapOf(
        "type" to action,
        "payload" to payload
      )
      val event: WritableMap = Arguments.makeNativeMap(map)
      reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(ON_STORE_ACTION, event)
  }
}
