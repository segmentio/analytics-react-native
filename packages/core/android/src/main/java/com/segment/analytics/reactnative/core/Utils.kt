package com.segment.analytics.reactnative.core

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.segment.analytics.ValueMap

object Utils {
    fun toArray(readableArray: ReadableArray?): Array<Any?> {
        if (readableArray == null) {
            return arrayOfNulls(0)
        }
        val array = arrayOfNulls<Any>(readableArray.size())
        for (i in 0 until readableArray.size()) {
            val type = readableArray.getType(i)
            when (type) {
                ReadableType.Null -> array[i] = null
                ReadableType.Boolean -> array[i] = readableArray.getBoolean(i)
                ReadableType.Number -> array[i] = readableArray.getDouble(i)
                ReadableType.String -> array[i] = readableArray.getString(i)
                ReadableType.Map -> array[i] = toValueMap(readableArray.getMap(i))
                ReadableType.Array -> array[i] = toArray(readableArray.getArray(i))
            }
        }
        return array
    }

    fun toValueMap(readableMap: ReadableMap?): ValueMap {
        if (readableMap == null) {
            return ValueMap()
        }
        val map = ValueMap()
        val iterator = readableMap.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            val type = readableMap.getType(key)
            when (type) {
                ReadableType.Null -> map[key] = null
                ReadableType.Boolean -> map[key] = readableMap.getBoolean(key)
                ReadableType.Number -> map[key] = readableMap.getDouble(key)
                ReadableType.String -> map[key] = readableMap.getString(key)
                ReadableType.Map -> map[key] = toValueMap(readableMap.getMap(key))
                ReadableType.Array -> map[key] = toArray(readableMap.getArray(key))
            }
        }
        return map
    }
}
