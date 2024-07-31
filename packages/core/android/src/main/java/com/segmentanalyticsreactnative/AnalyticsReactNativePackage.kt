package com.segmentanalyticsreactnative

import java.util.Arrays
import java.util.Collections

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.JavaScriptModule
import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

class AnalyticsReactNativePackage : ReactPackage {

    private var isInitialized = false
    private var anonymousId: String? = null
    private var module: AnalyticsReactNativeModule? = null

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        module = AnalyticsReactNativeModule(reactContext)
        module?.onInitialized = {
            isInitialized = true
            anonymousId?.let { anonId ->
                module?.setAnonymousId(anonId)
            }
        }
         val networkConnectionManager = NetworkConnectionManagerImpl(
            reactContext.applicationContext,
            CoroutineScope(Dispatchers.Default)
        )
        return listOf(module as NativeModule,NetInfoModule(reactContext, networkConnectionManager))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList<ViewManager<*, *>>()
    }

    fun setAnonymousId(nativeAnonymousId: String) {
        if (isInitialized) {
            anonymousId = nativeAnonymousId;
            anonymousId?.let { anonId ->
              module?.setAnonymousId(anonId)
            }
        } else {
            anonymousId = nativeAnonymousId
        }
    }
}
