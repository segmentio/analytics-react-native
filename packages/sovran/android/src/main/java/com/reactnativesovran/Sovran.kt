package com.sovranreactnative

import android.util.Log
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class Sovran : ReactPackage {
  
  data class Action (val type: String, val payload: Map<String, Any?>)

  private var isInitialized = false
  private val queue = mutableListOf<Action>()
  private var module: SovranModule? = null

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    module = SovranModule(reactContext)

    module?.onInitialized = {
      Log.v("SovranModule", "onInitialized queue: ${queue.size}")
      isInitialized = true
      queue.forEach {
        module?.dispatch(it.type, it.payload)
      }
      queue.clear()
    }
    
    return listOf(module as NativeModule)

  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }

  fun dispatch(action: String, payload: Map<String, Any?>) {
    Log.v("SovranModule", "dispatch: $action isInitialized: $isInitialized")
    if (isInitialized) {
      module?.dispatch(action, payload)
    } else {
      queue.add(Action(action, payload))
    }
  }
}
