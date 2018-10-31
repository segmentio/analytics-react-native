/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Segment, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package com.segment.analytics.reactnative.core

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Promise
import com.segment.analytics.Analytics
import com.segment.analytics.Properties
import com.segment.analytics.Traits
import com.segment.analytics.ValueMap
import java.util.concurrent.TimeUnit

class RNAnalyticsModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    private val analytics
        get() = Analytics.with(reactApplicationContext)

    override fun getName() = "RNAnalytics"

    @ReactMethod
    fun setup(options: ReadableMap, promise: Promise) {
        val builder = Analytics
                .Builder(reactApplicationContext, options.getString("writeKey"))
                .flushQueueSize(options.getInt("flushAt"))

        if(options.getBoolean("recordScreenViews")) {
            builder.recordScreenViews()
        }

        if(options.getBoolean("trackAppLifecycleEvents")) {
            builder.trackApplicationLifecycleEvents()
        }

        if(options.getBoolean("trackAttributionData")) {
            builder.trackAttributionInformation()
        }

        if(options.hasKey("flushInterval")) {
            builder.flushInterval(
                options.getInt("flushInterval").toLong(),
                TimeUnit.MILLISECONDS
            )
        }

        if(options.getBoolean("debug")) {
            builder.logLevel(Analytics.LogLevel.VERBOSE)
        }

        try {
            Analytics.setSingletonInstance(
                RNAnalytics.buildWithIntegrations(builder)
            )
            promise.resolve(true)
        } catch(e: Exception) {
            promise.reject("E_SEGMENT_ERROR", e)
        }
    }

    @ReactMethod
    fun track(event: String, properties: ReadableMap, context: ReadableMap) = 
        analytics.track(event, Properties() from properties)

    @ReactMethod
    fun screen(name: String, properties: ReadableMap, context: ReadableMap) =
        analytics.screen(name, Properties() from properties)

    @ReactMethod
    fun identify(userId: String, traits: ReadableMap, context: ReadableMap) =
        analytics.identify(userId, Traits() from traits, null)

    @ReactMethod
    fun group(groupId: String, traits: ReadableMap, context: ReadableMap) =
        analytics.group(groupId, Traits() from traits)

    @ReactMethod
    fun alias(newId: String, context: ReadableMap) =
        analytics.alias(newId)

    @ReactMethod
    fun reset() =
        analytics.reset()

    @ReactMethod()
    fun flush() =
        analytics.flush()

    @ReactMethod
    fun enable() =
        analytics.optOut(false)

    @ReactMethod
    fun disable() =
        analytics.optOut(true)
}

private infix fun<T: ValueMap> T.from(source: ReadableMap): T {
    putAll(source.toHashMap())

    return this
}
