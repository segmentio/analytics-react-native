package com.analyticsreactnativepluginadvertisingid

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.ReactApplication
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import com.sovranreactnative.SovranModule
import com.facebook.react.module.annotations.ReactModule
import android.util.Log

@ReactModule(name="AnalyticsReactNativePluginAdvertisingId")
class AnalyticsReactNativePluginAdvertisingIdModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  init{
    getAdvertisingId(reactContext)
  }

  override fun getName(): String {
      return "AnalyticsReactNativePluginAdvertisingId"
  }

  fun  getAdvertisingId(reactContext: ReactApplicationContext) {

     val info = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
     val id = info.id
     val advertisingId = id.toString()

      val sovran = (currentActivity?.application as ReactApplication)
      ?.reactNativeHost
      ?.reactInstanceManager
      ?.currentReactContext
      ?.getNativeModule(SovranModule::class.java)

    Log.d("NATIVE CODE HIT", "IT IS AT LEAST BEING INVOKED")
    Log.d("ADVERTISING ID", advertisingId);
     val properties = mapOf("id" to advertisingId)
     sovran?.dispatch("add-advertisingId-data", properties)
 }
}
