package com.analyticsreactnativepluginadvertisingid

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import kotlinx.coroutines.*

@ReactModule(name = "AnalyticsReactNativePluginAdvertisingId")

class AnalyticsReactNativePluginAdvertisingIdModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AnalyticsReactNativePluginAdvertisingId"
    }

   /**
     * Return only the advertising ID string
     */
    @ReactMethod
    fun getAdvertisingId(promise: Promise) {
        Thread {
            try {
                val info = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
                promise.resolve(info.id ?: "")
            } catch (e: Exception) {
                promise.reject("ERROR", e)
            }
        }.start()
    }
    /**
     * Return only the "is limit ad tracking enabled" status
     */
    @ReactMethod
    fun getIsLimitAdTrackingEnableStatus(promise: Promise) {
        Thread {
            try {
                val info = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
                promise.resolve(info.isLimitAdTrackingEnabled ?: false)
            } catch (e: Exception) {
                promise.reject("ERROR", e)
            }
        }.start()
    }

    /**
     * Return both values together
     */
    @ReactMethod
    fun getAdvertisingInfo(promise: Promise) {
        Thread {
            try {
                val info = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
                val result = Arguments.createMap()
                result.putString("advertisingId", info.id ?: "")
                result.putBoolean("isLimitAdTrackingEnabled", info.isLimitAdTrackingEnabled ?: false)
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERROR", e)
            }
        }.start()
    }
}