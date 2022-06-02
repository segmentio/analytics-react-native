package com.analyticsreactnativepluginadvertisingid

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.ReactApplication
import com.google.android.gms.ads.identifier.AdvertisingIdClient
import com.sovranreactnative.SovranModule

class AnalyticsReactNativePluginAdvertisingIdModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  constructor(reactContext: ReactApplicationContext) : super(reactContext) {
    getAdvertisingId(reactContext)
  }

  override fun getName(): String {
      return "AnalyticsReactNativePluginAdvertisingId"
  }

  fun  getAdvertisingId(reactContext) {

     val info = AdvertisingIdClient.getAdvertisingIdInfo(reactContext)
     val id = info.id
     val advertisingId = id.toString()
     val properties = Hashtable<String, String>()
      val sovran = (currentActivity?.application as ReactApplication)
      ?.reactNativeHost
      ?.reactInstanceManager
      ?.currentReactContext
      ?.getNativeModule(SovranModule::class.java)

     properties["id"] = advertisingId
     sovran?.dispatch("add-advertisingId-data", properties)
 }
}
