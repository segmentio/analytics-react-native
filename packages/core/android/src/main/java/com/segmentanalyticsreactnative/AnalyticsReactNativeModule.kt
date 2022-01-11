package com.segmentanalyticsreactnative

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageInfo
import android.content.res.Resources
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.provider.Settings
import android.provider.Settings.Secure.getString
import androidx.core.content.pm.PackageInfoCompat
import com.facebook.react.bridge.*
import java.util.*


enum class ConnectionType {
  Cellular, Unknown, Wifi
}

class AnalyticsReactNativeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  private val pInfo: PackageInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)

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

    @SuppressLint("HardwareIds")
    private fun getUniqueId(collectDeviceId : Boolean): String? {
      if (collectDeviceId) {
        return getString(reactApplicationContext.contentResolver, Settings.Secure.ANDROID_ID)
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

      contextInfo.putString("appName", appName)
      contextInfo.putString("appVersion", appVersion)
      contextInfo.putString("buildNumber", buildNumber)
      contextInfo.putString("bundleId", bundleId)
      contextInfo.putString("deviceId", getUniqueId(config.hasKey("collectDeviceId") && config.getBoolean("collectDeviceId")))
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
}
