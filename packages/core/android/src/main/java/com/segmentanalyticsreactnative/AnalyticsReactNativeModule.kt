package com.segmentanalyticsreactnative

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.res.Resources
import android.media.MediaDrm
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.pm.PackageInfoCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.sovranreactnative.SovranModule
import java.lang.Exception
import java.util.*
import java.security.MessageDigest
import java.util.UUID


enum class ConnectionType {
  Cellular, Unknown, Wifi
}

@ReactModule(name="AnalyticsReactNative")
class AnalyticsReactNativeModule : ReactContextBaseJavaModule, ActivityEventListener, LifecycleEventListener {

  constructor(reactContext: ReactApplicationContext) : super(reactContext) {
    this.pInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
    // Listen for new intents when app is in the background
    reactContext.addActivityEventListener(this)
    // Listen for resume events when it is cold started, or in the background
    reactContext.addLifecycleEventListener(this)
  }

  private var isColdLaunch = true
  private val pInfo: PackageInfo

  override fun getName(): String {
      return "AnalyticsReactNative"
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getUUIDSync(): String {
    return UUID.randomUUID().toString()
  }

  private fun getBuildNumber(): String {
      return PackageInfoCompat.getLongVersionCode(pInfo).toString()
    }

  fun ByteArray.toHexString() = joinToString("") { "%02x".format(it) }

  /**
   * Workaround for not able to get device id on Android 10 or above using DRM API
   * {@see https://stackoverflow.com/questions/58103580/android-10-imei-no-longer-available-on-api-29-looking-for-alternatives}
   * {@see https://developer.android.com/training/articles/user-data-ids}
   */
  private fun getUniqueId(collectDeviceId : Boolean): String? {
    if (collectDeviceId) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR2)
        return null

      val WIDEVINE_UUID = UUID(-0x121074568629b532L, -0x5c37d8232ae2de13L)
      var wvDrm: MediaDrm? = null
      try {
        wvDrm = MediaDrm(WIDEVINE_UUID)
        val wideVineId = wvDrm.getPropertyByteArray(MediaDrm.PROPERTY_DEVICE_UNIQUE_ID)
        val md = MessageDigest.getInstance("SHA-256")
        md.update(wideVineId)
        return md.digest().toHexString()
      } catch (e: Exception) {
        return null
      } finally {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          wvDrm?.close()
        } else {
          wvDrm?.release()
        }
      }
    }
    return null
  }

  private fun getConnectionType(context: Context): ConnectionType {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager?
    var result: ConnectionType = ConnectionType.Unknown

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      cm?.run {
        cm.getNetworkCapabilities(cm.activeNetwork)?.run {
          if (hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            result = ConnectionType.Wifi
          } else if (hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
            result = ConnectionType.Cellular
          } else {
            result = ConnectionType.Unknown
          }
        }
      }
    } else {
      cm?.run {
        cm.activeNetworkInfo?.run {
          if (type == ConnectivityManager.TYPE_WIFI) {
            result = ConnectionType.Wifi
          } else if (type == ConnectivityManager.TYPE_MOBILE) {
            result = ConnectionType.Cellular
          } else {
            result = ConnectionType.Unknown
          }
        }
      }
    }
    return result
  }

  @ReactMethod
  fun getContextInfo(config: ReadableMap, promise: Promise) {
    val appName: String = reactApplicationContext.applicationInfo.loadLabel(reactApplicationContext.packageManager).toString()
    val appVersion: String = pInfo.versionName
    val buildNumber = getBuildNumber()
    val bundleId = reactApplicationContext.packageName

    val connectionType: ConnectionType = getConnectionType(reactApplicationContext)
    val timezone: TimeZone = TimeZone.getDefault()
    val currentLocale: Locale = Locale.getDefault()
    val locale: String = "${currentLocale.language}-${currentLocale.country}"

    val screenWidth =  Resources.getSystem().displayMetrics.widthPixels
    val screenHeight =  Resources.getSystem().displayMetrics.heightPixels

    val screenDensity = Resources.getSystem().displayMetrics.density;

    val contextInfo: WritableMap = Arguments.createMap()

    // generate random identifier that does not persist across installations
    // use it as the fallback in case DRM API failed to generate one.
    val fallbackDeviceId = UUID.randomUUID().toString()
    val deviceId = getUniqueId(config.hasKey("collectDeviceId") && config.getBoolean("collectDeviceId"))?: fallbackDeviceId

    contextInfo.putString("appName", appName)
    contextInfo.putString("appVersion", appVersion)
    contextInfo.putString("buildNumber", buildNumber)
    contextInfo.putString("bundleId", bundleId)
    contextInfo.putString("deviceId", deviceId)
    contextInfo.putString("deviceName", Build.DEVICE)
    contextInfo.putString("deviceType", "android")
    contextInfo.putString("manufacturer", Build.MANUFACTURER)
    contextInfo.putString("model", Build.MODEL)

    contextInfo.putString("timezone", timezone.id)
    contextInfo.putString("locale", locale)
    contextInfo.putString("networkType", connectionType.toString().toLowerCase(currentLocale))

    contextInfo.putString("osName", "Android")
    contextInfo.putString("osVersion", Build.VERSION.RELEASE)

    contextInfo.putInt("screenWidth", screenWidth)
    contextInfo.putInt("screenHeight", screenHeight)
    contextInfo.putDouble("screenDensity", screenDensity.toDouble())

    promise.resolve(contextInfo)
  }

  fun getReferrer(activity: Activity): Uri? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
      activity.referrer
    } else {
      null
    }
  }

  fun trackDeepLinks(intent: Intent?) {
    if (intent == null || intent.data == null) {
      Log.d(name, "No Intent data found")
      return
    }

    val properties = Hashtable<String, String>()

    if (currentActivity == null) {
      Log.d(name, "No activity found")
      return
    }

    val referrer = getReferrer(currentActivity!!)

    if (referrer != null) {
      val referringApplication = referrer.toString()
      properties["referring_application"] = referringApplication
    }

    val uri = intent.data
    try {
      properties["url"] = uri.toString()
      for (parameter in uri!!.queryParameterNames) {
        val value = uri.getQueryParameter(parameter)
        if (value != null && value.trim { it <= ' ' }.isNotEmpty()) {
          properties[parameter] = value
        }
      }
    } catch (e: Exception) {
      // handle error
      Log.d(name, "Error getting URL: ${e.message}")
      return
    }

    Log.d(name, "Sending Deeplink data to store: uri=${uri}, referrer=${referrer}")
    val sovran = (currentActivity?.application as ReactApplication)
      ?.reactNativeHost
      ?.reactInstanceManager
      ?.currentReactContext
      ?.getNativeModule(SovranModule::class.java)
    sovran?.dispatch("add-deepLink-data", properties)
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    // Do nothing
  }

  override fun onNewIntent(intent: Intent?) {
    Log.d(name, "onNewIntent = ${intent}")
    trackDeepLinks(intent)
  }

  override fun onHostResume() {
    if (currentActivity != null && isColdLaunch) {
      isColdLaunch = false
      Log.d(name, "onHostResume = ${currentActivity!!.intent}")
      trackDeepLinks(currentActivity!!.intent)
    }
  }

  override fun onHostPause() {
    // Do nothing
  }

  override fun onHostDestroy() {
    isColdLaunch = true
    // Do nothing
  }
}
