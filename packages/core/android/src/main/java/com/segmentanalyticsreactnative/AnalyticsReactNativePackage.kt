package com.segmentanalyticsreactnative

import java.util.Arrays
import java.util.Collections

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.JavaScriptModule

class AnalyticsReactNativePackage : ReactPackage {

    private var isInitialized = false
    private var anonymousId = ""
    private var module: AnalyticsReactNativeModule? = null

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        module = AnalyticsReactNativeModule(reactContext)
        module?.onInitialized = {
            isInitialized = true
            module?.setAnonymousId(anonymousId)
        }
        return listOf(module as NativeModule)
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList<ViewManager<*, *>>()
    }

    fun setAnonymousId(nativeAnonymousId: String) {
        if (isInitialized) {
            module?.setAnonymousId(anonymousId)
        } else {
            anonymousId = nativeAnonymousId;
        }
    }
}
