package com.analyticsreactnativepluginadvertisingid

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.ReactApplication
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import com.google.android.gms.common.GooglePlayServicesNotAvailableException;
import com.sovranreactnative.SovranModule
import com.facebook.react.module.annotations.ReactModule
import android.util.Log
import java.io.IOException;


@ReactModule(name="AnalyticsReactNativePluginAdvertisingId")
class AnalyticsReactNativePluginAdvertisingIdModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
      return "AnalyticsReactNativePluginAdvertisingId"
  }

  @ReactMethod
  fun getAdvertisingId(promise: Promise) {
    val reactContext = (currentActivity?.application as ReactApplication)
    ?.reactNativeHost
    ?.reactInstanceManager
    ?.currentReactContext

    if (reactContext == null) {
      promise.resolve(null)
      return
    }

     try {
      val advertisingInfo = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
      val isLimitAdTrackingEnabled = advertisingInfo.isLimitAdTrackingEnabled
      
      if (isLimitAdTrackingEnabled) {
       promise.resolve(null)
      }

     val id = advertisingInfo.id
     val advertisingId = id.toString()
     promise.resolve(advertisingId)
     }
     catch (e: GooglePlayServicesNotAvailableException) {
      Log.d(name, e.toString())
      promise.resolve(null)
     }
     catch ( e: IOException) {
      Log.d(name, e.toString())
      promise.resolve(null) 
     }    
 }
}