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
import com.segment.analytics.Analytics
import com.segment.analytics.Properties
import com.segment.analytics.Traits
import com.segment.analytics.ValueMap

class RNAnalyticsModule(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {
    private val analytics
        get() = Analytics.with(reactApplicationContext)

    override fun getName() = "RNAnalytics"

    @ReactMethod
    fun setup(options: ReadableMap) {
        val android = options.getMap("android")
        val builder = Analytics
                .Builder(reactApplicationContext, android.getString("writeKey"))
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

        if(options.getBoolean("debug")) {
            builder.logLevel(Analytics.LogLevel.VERBOSE)
        }

        Analytics.setSingletonInstance(
            RNAnalytics.buildWithIntegrations(builder)
        )
    }

    @ReactMethod
    fun track(event: String, properties: ReadableMap) = 
        analytics.track(event, Properties() from properties)

    @ReactMethod
    fun screen(name: String, properties: ReadableMap) =
        analytics.screen(name, Properties() from properties)

    @ReactMethod
    fun identify(userId: String, traits: ReadableMap) =
        analytics.identify(userId, Traits() from traits, null)

    @ReactMethod
    fun group(groupId: String, traits: ReadableMap) =
        analytics.group(groupId, Traits() from traits)

    @ReactMethod
    fun alias(newId: String) =
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
