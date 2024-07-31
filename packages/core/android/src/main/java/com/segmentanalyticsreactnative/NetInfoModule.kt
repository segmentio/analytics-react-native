package com.segmentanalyticsreactnative

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first

class NetInfoModule(
    reactContext: ReactApplicationContext,
    private val networkConnectionManager: NetworkConnectionManager
) : ReactContextBaseJavaModule(reactContext) {

 private val coroutineScope = CoroutineScope(Dispatchers.Default)

    override fun getName() = "NetInfoModule"

    @ReactMethod
    fun createCalendarEvent(name: String, location: String) {
        Log.d("NetInfoModule", "Create event called with name: $name and location: $location")
    }

    @ReactMethod
    fun isNetworkConnected(promise: Promise) {
        coroutineScope.launch {
            val isConnected = networkConnectionManager.isNetworkConnectedFlow.first()
            promise.resolve(isConnected)
        }
    }

    @ReactMethod
    fun startNetworkListening() {
        networkConnectionManager.startListenNetworkState()
        coroutineScope.launch {
            networkConnectionManager.isNetworkConnectedFlow.collect { isConnected ->
                sendEventToJS(isConnected)
            }
        }
    }

    @ReactMethod
    fun stopNetworkListening() {
        networkConnectionManager.stopListenNetworkState()
        coroutineScope.cancel() // Cancel the coroutine to stop collecting network changes
    }

    private fun sendEventToJS(isConnected: Boolean) {
        val params = Arguments.createMap().apply {
            putBoolean("isConnected", isConnected)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("networkStatusChanged", params)
    }
     // Required for NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built-in Event Emitter Calls.
    }
}